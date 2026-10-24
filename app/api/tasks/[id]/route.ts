import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { one, rawQuery } from "@/lib/db";
import {
  loadTasks,
  notifyLeaders,
  notifyUser,
  releaseStaffStatusIfIdle,
  setStaffStatus,
  syncTaskRollup,
} from "@/lib/tasks";
import type { StaffStatus, TaskPriority, TaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const ASSIGNEE_STATUSES: TaskStatus[] = ["pending", "working", "submitted", "completed"];
const STAFF_STATUSES: StaffStatus[] = ["working", "free", "offline", "active"];

function normalizeLink(value: string): string {
  const link = value.trim();
  if (link && !/^https?:\/\//i.test(link)) return `https://${link}`;
  return link;
}

function toIdList(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw.map((v) => String(v ?? "").trim()).filter(Boolean)
    : typeof raw === "string"
    ? raw
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
  return Array.from(new Set(list));
}

/**
 * Replace a task's roster with the selected members. Progress of members who
 * stay on the task is preserved; only untouched 'pending' rows are removed.
 */
async function replaceAssignees(
  taskId: string,
  ids: string[],
  sectionSlug: "bd" | "it",
  actorName: string
): Promise<{ names: string[]; error: string | null }> {
  if (ids.length === 0) {
    return { names: [], error: "Select at least one team member for this work." };
  }

  const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
  const eligible = await rawQuery<Record<string, unknown>>(
    `SELECT id, name, section_slug FROM df_users
     WHERE portal_role = 'staff' AND id IN (${placeholders})`,
    ids
  );
  const valid = eligible.filter(
    (u) => String(u.section_slug ?? sectionSlug) === sectionSlug
  );
  if (valid.length === 0) {
    return {
      names: [],
      error: `No valid ${sectionSlug.toUpperCase()} team member selected — members must belong to that department.`,
    };
  }

  const keepIds = valid.map((u) => String(u.id));
  // $1 is the task id, so the roster placeholders must start at $2
  const keepPlaceholders = keepIds.map((_, i) => `$${i + 2}`).join(", ");
  await rawQuery(
    `DELETE FROM df_task_assignees
     WHERE task_id = $1 AND status = 'pending' AND user_id NOT IN (${keepPlaceholders})`,
    [taskId, ...keepIds]
  );

  const taskRow = await one<{ title: string }>(
    `SELECT title FROM df_tasks WHERE id = $1`,
    [taskId]
  );

  for (const member of valid) {
    const existingRow = await one<{ id: string }>(
      `SELECT id FROM df_task_assignees WHERE task_id = $1 AND user_id = $2`,
      [taskId, String(member.id)]
    );
    if (!existingRow) {
      await rawQuery(
        `INSERT INTO df_task_assignees (id, task_id, user_id, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (task_id, user_id) DO NOTHING`,
        [randomUUID(), taskId, String(member.id)]
      );
      await notifyUser(
        String(member.id),
        "task_assigned",
        `New Work Assigned (${sectionSlug.toUpperCase()} Todo)`,
        `${actorName} added you to: "${String(taskRow?.title ?? "task")}"`
      );
    }
  }

  return { names: valid.map((u) => String(u.name)), error: null };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_tasks WHERE id = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Task not found." }, 404);
  }

  const sectionSlug = String(existing.section_slug) as "bd" | "it";
  const originSection =
    String(existing.origin_section ?? "") === "bd" ||
    String(existing.origin_section ?? "") === "it"
      ? (String(existing.origin_section) as "bd" | "it")
      : null;
  const requestKind = String(existing.request_kind ?? "direct") === "cross" ? "cross" : "direct";
  const requestStatus = String(existing.request_status ?? "none");
  const taskTitle = String(existing.title);

  const actorDept: "bd" | "it" | null =
    actor.portalRole === "it_ceo"
      ? "it"
      : actor.portalRole === "bd_ceo"
      ? "bd"
      : null;

  const isOwner = actor.portalRole === "erp_owner";
  // Manager = CEO of the department that EXECUTES the work (+ ERP Owner).
  const isWorkManager = canManageStaffSection(actor, sectionSlug);
  // Requester = CEO who raised a cross-department request.
  const isRequester =
    requestKind === "cross" && actorDept !== null && actorDept === originSection;

  const myRow = await one<Record<string, unknown>>(
    `SELECT * FROM df_task_assignees WHERE task_id = $1 AND user_id = $2`,
    [id, actor.id]
  );

  if (!isWorkManager && !isRequester && !myRow) {
    return jsonNoStore({ error: "Not authorized to update this task." }, 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: "update" | "accept_request" | "decline_request" | "assign" | "withdraw";
    status?: TaskStatus;
    assigneeId?: string;
    assigneeIds?: string[] | string;
    submissionLink?: string;
    completionNote?: string;
    nextStaffStatus?: StaffStatus;
    declineReason?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    referenceLink?: string;
  };

  const action = body.action ?? "update";

  // ── 1. CEO accepts / declines a cross-department (CEO ⇄ CEO) request ─────
  if (action === "accept_request" || action === "decline_request") {
    if (requestKind !== "cross") {
      return jsonNoStore({ error: "This task is not a CEO work request." }, 400);
    }
    if (!isWorkManager) {
      return jsonNoStore(
        {
          error: `Only the ${sectionSlug.toUpperCase()} CEO (or ERP Owner) can answer this request.`,
        },
        403
      );
    }
    if (requestStatus !== "pending") {
      return jsonNoStore({ error: "This request has already been answered." }, 409);
    }

    const accepting = action === "accept_request";
    const declineReason = accepting
      ? ""
      : String(body.declineReason ?? "").trim() ||
        `${sectionSlug.toUpperCase()} team cannot take this right now.`;

    const assigneeIds = accepting ? toIdList(body.assigneeIds) : [];
    let assignedNames: string[] = [];
    if (assigneeIds.length > 0) {
      const result = await replaceAssignees(id, assigneeIds, sectionSlug, actor.name);
      if (result.error) {
        return jsonNoStore({ error: result.error }, 400);
      }
      assignedNames = result.names;
    }

    await rawQuery(
      `UPDATE df_tasks
       SET request_status = $1,
           accepted_by_id = CASE WHEN $2 THEN $3 ELSE accepted_by_id END,
           accepted_by_name = CASE WHEN $2 THEN $4 ELSE accepted_by_name END,
           decline_reason = $5,
           updated_at = NOW()
       WHERE id = $6`,
      [
        accepting ? "accepted" : "declined",
        accepting,
        actor.id,
        actor.name,
        declineReason,
        id,
      ]
    );

    await notifyLeaders({
      section: originSection,
      includeOwner: true,
      kind: accepting ? "task_request_accepted" : "task_request_declined",
      title: accepting
        ? `${sectionSlug.toUpperCase()} CEO accepted your request`
        : `${sectionSlug.toUpperCase()} CEO declined your request`,
      body: accepting
        ? `"${taskTitle}" accepted by ${actor.name}${
            assignedNames.length > 0
              ? ` and assigned to ${assignedNames.join(", ")}.`
              : ` — assign it to your team now.`
          }`
        : `"${taskTitle}" — ${declineReason}`,
    });

    await syncTaskRollup(id);
    await logAudit({
      actor,
      action: `task.${action}`,
      targetType: "task",
      summary: `${accepting ? "Accepted" : "Declined"} cross-CEO request "${taskTitle}" (${
        originSection ? originSection.toUpperCase() : "—"
      } → ${sectionSlug.toUpperCase()})`,
    });

    const updated = await loadTasks("WHERE t.id = $1", [id], actor.id);
    return jsonNoStore({ task: updated[0] ?? null });
  }

  // ── 2. Requester withdraws a still-pending request ────────────────────────
  if (action === "withdraw") {
    if (!isRequester && !isOwner) {
      return jsonNoStore({ error: "Only the requesting CEO can withdraw this." }, 403);
    }
    if (requestKind !== "cross" || requestStatus !== "pending") {
      return jsonNoStore({ error: "Only pending requests can be withdrawn." }, 409);
    }
    await rawQuery(`DELETE FROM df_tasks WHERE id = $1`, [id]);
    await logAudit({
      actor,
      action: "task.cross_withdrawn",
      targetType: "task",
      summary: `Withdrew work request "${taskTitle}"`,
    });
    return jsonNoStore({ ok: true });
  }

  // ── 3. Assign / re-assign the roster (one work item → many members) ──────
  if (action === "assign") {
    if (!isWorkManager) {
      return jsonNoStore(
        { error: `Only the ${sectionSlug.toUpperCase()} CEO can assign team members.` },
        403
      );
    }
    const result = await replaceAssignees(
      id,
      toIdList(body.assigneeIds),
      sectionSlug,
      actor.name
    );
    if (result.error) {
      return jsonNoStore({ error: result.error }, 400);
    }

    // Assigning immediately also answers a pending request from the other CEO.
    if (requestKind === "cross" && requestStatus === "pending") {
      await rawQuery(
        `UPDATE df_tasks
         SET request_status = 'accepted', accepted_by_id = $1, accepted_by_name = $2, updated_at = NOW()
         WHERE id = $3`,
        [actor.id, actor.name, id]
      );
      await notifyLeaders({
        section: originSection,
        includeOwner: false,
        kind: "task_request_accepted",
        title: `${sectionSlug.toUpperCase()} CEO accepted your request`,
        body: `"${taskTitle}" — assigned to ${result.names.join(", ")}.`,
      });
    }

    await syncTaskRollup(id);
    await logAudit({
      actor,
      action: "task.assigned",
      targetType: "task",
      summary: `Assigned "${taskTitle}" to ${result.names.join(", ")}`,
    });

    const updated = await loadTasks("WHERE t.id = $1", [id], actor.id);
    return jsonNoStore({ task: updated[0] ?? null });
  }

  // ── 4. Per-member progress updates (staff self / CEO review per member) ──
  const requestedStatus =
    body.status && ASSIGNEE_STATUSES.includes(body.status) ? body.status : null;

  if (body.status && !requestedStatus) {
    return jsonNoStore({ error: "Unknown task status." }, 400);
  }

  if (!isWorkManager && myRow) {
    // Team members act ONLY on their own assignment row.
    if (
      requestedStatus !== "working" &&
      requestedStatus !== "submitted" &&
      requestedStatus !== "pending"
    ) {
      return jsonNoStore(
        { error: "Team members can only start or submit their own work." },
        403
      );
    }
  }

  let targetUserIds: string[] = [];
  if (isWorkManager) {
    if (body.assigneeId) {
      targetUserIds = [String(body.assigneeId)];
    } else if (requestedStatus === "completed") {
      // Approve everyone who submitted; if nobody has, approve the whole roster.
      const submitted = await rawQuery<{ user_id: string }>(
        `SELECT user_id FROM df_task_assignees WHERE task_id = $1 AND status IN ('submitted', 'working')`,
        [id]
      );
      const all =
        submitted.length > 0
          ? submitted
          : await rawQuery<{ user_id: string }>(
              `SELECT user_id FROM df_task_assignees WHERE task_id = $1`,
              [id]
            );
      targetUserIds = all.map((r) => String(r.user_id));
    } else {
      const rows = await rawQuery<{ user_id: string }>(
        `SELECT user_id FROM df_task_assignees WHERE task_id = $1`,
        [id]
      );
      targetUserIds = rows.map((r) => String(r.user_id));
    }
  } else if (myRow) {
    targetUserIds = [actor.id];
  }

  const hasProgressChange = requestedStatus !== null;
  if (hasProgressChange && targetUserIds.length === 0) {
    return jsonNoStore(
      { error: "Nobody is assigned to this work yet — assign the team first." },
      409
    );
  }

  const nextStatus: TaskStatus = requestedStatus ?? "pending";
  const linkValue =
    nextStatus === "pending"
      ? ""
      : body.submissionLink !== undefined
      ? normalizeLink(body.submissionLink)
      : null;
  const noteValue =
    nextStatus === "pending"
      ? ""
      : body.completionNote !== undefined
      ? body.completionNote.trim()
      : null;
  const reviewerName = isWorkManager ? actor.name : "";

  for (const userId of targetUserIds) {
    await rawQuery(
      `UPDATE df_task_assignees
       SET status = $1,
           accepted_at = CASE WHEN $1 IN ('working', 'submitted', 'completed')
                              THEN COALESCE(accepted_at, NOW()) ELSE NULL END,
           submitted_at = CASE WHEN $1 IN ('submitted', 'completed')
                               THEN COALESCE(submitted_at, NOW()) ELSE submitted_at END,
           submission_link = COALESCE($2, submission_link),
           completion_note = COALESCE($3, completion_note),
           reviewed_by_name = CASE WHEN $5 <> '' THEN $5 ELSE reviewed_by_name END,
           reviewed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE reviewed_at END,
           updated_at = NOW()
       WHERE task_id = $4 AND user_id = $6`,
      [nextStatus, linkValue, noteValue, id, reviewerName, userId]
    );

    // Automatic per-member status transitions
    if (nextStatus === "working") {
      await setStaffStatus(userId, "working");
    } else if (
      body.nextStaffStatus &&
      STAFF_STATUSES.includes(body.nextStaffStatus)
    ) {
      await setStaffStatus(userId, body.nextStaffStatus);
    } else if (
      nextStatus === "submitted" ||
      nextStatus === "completed" ||
      nextStatus === "pending"
    ) {
      await releaseStaffStatusIfIdle(userId, id);
    }

    if (nextStatus === "submitted" && !isWorkManager) {
      await notifyLeaders({
        section: sectionSlug,
        includeOwner: true,
        kind: "task_submitted",
        title: `Work Submitted — ${actor.name}`,
        body: `Submitted "${taskTitle}"${linkValue ? ` (${linkValue})` : ""}`,
      });
    }

    if (isWorkManager && userId !== actor.id) {
      await notifyUser(
        userId,
        nextStatus === "completed" ? "task_approved" : "task_returned",
        nextStatus === "completed" ? "Work Approved" : "Work Returned For Revisions",
        nextStatus === "completed"
          ? `${actor.name} approved your part of "${taskTitle}"`
          : `${actor.name} returned "${taskTitle}" — please pick it up again.`
      );
    }
  }

  const rolledStatus = await syncTaskRollup(id);

  // Whole task finished → tell the CEO who requested the work
  if (
    hasProgressChange &&
    isWorkManager &&
    rolledStatus === "completed" &&
    String(existing.status) !== "completed" &&
    requestKind === "cross" &&
    originSection
  ) {
    await notifyLeaders({
      section: originSection,
      includeOwner: false,
      kind: "task_delivered",
      title: "Requested Work Delivered",
      body: `"${taskTitle}" — completed by the ${sectionSlug.toUpperCase()} team.`,
    });
  }

  // ── 5. Content edits (manager, or requester while the request is pending) ─
  const canEditContent =
    isWorkManager || (isRequester && requestStatus === "pending");
  if (
    canEditContent &&
    (body.title?.trim() ||
      body.description !== undefined ||
      body.priority ||
      body.dueDate !== undefined ||
      body.referenceLink !== undefined)
  ) {
    const nextDue =
      body.dueDate === undefined
        ? existing.due_date ?? null
        : body.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
        ? body.dueDate
        : null;

    await rawQuery(
      `UPDATE df_tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           priority = COALESCE($3, priority),
           due_date = $4,
           reference_link = COALESCE($5, reference_link),
           updated_at = NOW()
       WHERE id = $6`,
      [
        body.title?.trim() || null,
        body.description !== undefined ? body.description.trim() : null,
        body.priority && ["normal", "high", "urgent"].includes(body.priority)
          ? body.priority
          : null,
        nextDue,
        body.referenceLink !== undefined ? normalizeLink(body.referenceLink) : null,
        id,
      ]
    );
  }

  const updated = await loadTasks("WHERE t.id = $1", [id], actor.id);
  return jsonNoStore({ task: updated[0] ?? null, status: rolledStatus });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor) return jsonNoStore({ error: "Sign in required." }, 401);

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_tasks WHERE id = $1`,
    [id]
  );
  if (!existing) return jsonNoStore({ error: "Task not found." }, 404);

  const actorDept: "bd" | "it" | null =
    actor.portalRole === "it_ceo"
      ? "it"
      : actor.portalRole === "bd_ceo"
      ? "bd"
      : null;
  const isRequester =
    String(existing.request_kind ?? "direct") === "cross" &&
    actorDept !== null &&
    actorDept === String(existing.origin_section ?? "");

  if (
    !canManageStaffSection(actor, String(existing.section_slug)) &&
    !isRequester &&
    actor.portalRole !== "erp_owner"
  ) {
    return jsonNoStore({ error: "Not authorized." }, 403);
  }

  await rawQuery(`DELETE FROM df_tasks WHERE id = $1`, [id]);
  return jsonNoStore({ ok: true });
}
