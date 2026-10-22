import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
} from "@/lib/auth";
import { one, rawQuery, toNum } from "@/lib/db";
import { mapTaskRow } from "@/lib/mappers";
import type { StaffStatus, TaskPriority, TaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

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

  const assignedUserId = String(existing.assigned_to_id);
  const sectionSlug = String(existing.section_slug);
  const isAssignee = assignedUserId === actor.id;
  const isManager = canManageStaffSection(actor, sectionSlug);

  if (!isAssignee && !isManager) {
    return jsonNoStore({ error: "Not authorized to update this task." }, 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: TaskStatus;
    submissionLink?: string;
    completionNote?: string;
    nextStaffStatus?: StaffStatus;
    title?: string;
    description?: string;
    priority?: TaskPriority;
  };

  const nextStatus: TaskStatus = [
    "pending",
    "working",
    "submitted",
    "completed",
  ].includes(body.status as string)
    ? (body.status as TaskStatus)
    : (existing.status as TaskStatus);

  let nextSubmissionLink =
    body.submissionLink !== undefined
      ? body.submissionLink.trim()
      : String(existing.submission_link ?? "");
  if (nextSubmissionLink && !/^https?:\/\//i.test(nextSubmissionLink)) {
    nextSubmissionLink = `https://${nextSubmissionLink}`;
  }

  const nextNote =
    body.completionNote !== undefined
      ? body.completionNote.trim()
      : String(existing.completion_note ?? "");

  const nextTitle =
    isManager && body.title?.trim()
      ? body.title.trim()
      : String(existing.title);
  const nextDesc =
    isManager && body.description !== undefined
      ? body.description.trim()
      : String(existing.description ?? "");
  const nextPriority: TaskPriority =
    isManager && ["normal", "high", "urgent"].includes(body.priority as string)
      ? (body.priority as TaskPriority)
      : (existing.priority as TaskPriority);

  const shouldSetAccepted =
    nextStatus === "working" ||
    nextStatus === "submitted" ||
    nextStatus === "completed";
  const shouldSetSubmitted =
    nextStatus === "submitted" || nextStatus === "completed";

  await rawQuery(
    `UPDATE df_tasks
     SET status = $1,
         submission_link = $2,
         completion_note = $3,
         title = $4,
         description = $5,
         priority = $6,
         accepted_at = CASE WHEN $7 THEN COALESCE(accepted_at, NOW()) ELSE accepted_at END,
         submitted_at = CASE WHEN $8 THEN COALESCE(submitted_at, NOW()) ELSE submitted_at END,
         updated_at = NOW()
     WHERE id = $9`,
    [
      nextStatus,
      nextSubmissionLink,
      nextNote,
      nextTitle,
      nextDesc,
      nextPriority,
      shouldSetAccepted,
      shouldSetSubmitted,
      id,
    ]
  );

  // Automatic Staff Status Transitions!
  let updatedStaffStatus: StaffStatus | null = null;
  if (nextStatus === "working") {
    // Selecting / starting a todo task automatically sets status -> 'working'!
    updatedStaffStatus = "working";
    await rawQuery(
      `UPDATE df_users SET staff_status = 'working', updated_at = NOW() WHERE id = $1`,
      [assignedUserId]
    );
  } else if (body.nextStaffStatus && ["working", "free", "offline", "active"].includes(body.nextStaffStatus)) {
    updatedStaffStatus = body.nextStaffStatus;
    await rawQuery(
      `UPDATE df_users SET staff_status = $1, updated_at = NOW() WHERE id = $2`,
      [body.nextStaffStatus, assignedUserId]
    );
  } else if (nextStatus === "submitted" || nextStatus === "completed") {
    // Check if staff still has any other active 'working' tasks; if none, auto-set to 'free'!
    const otherWorking = await one<{ cnt: unknown }>(
      `SELECT COUNT(*)::int AS cnt
       FROM df_tasks
       WHERE assigned_to_id = $1 AND status = 'working' AND id <> $2`,
      [assignedUserId, id]
    );
    if (toNum(otherWorking?.cnt, 0) === 0) {
      updatedStaffStatus = "free";
      await rawQuery(
        `UPDATE df_users SET staff_status = 'free', updated_at = NOW() WHERE id = $1`,
        [assignedUserId]
      );
    }
  }

  // Notify CEO + ERP Owner when staff submits work!
  if (isAssignee && nextStatus === "submitted" && existing.status !== "submitted") {
    const ceoRole = sectionSlug === "it" ? "it_ceo" : "bd_ceo";
    const leaders = await rawQuery<{ id: string }>(
      `SELECT id FROM df_users WHERE portal_role = 'erp_owner' OR portal_role = $1`,
      [ceoRole]
    );
    for (const leader of leaders) {
      await rawQuery(
        `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
         VALUES ($1, $2, 'task_submitted', $3, $4, '/portals')`,
        [
          randomUUID(),
          leader.id,
          `Work Submitted — ${actor.name}`,
          `Submitted "${nextTitle}"${nextSubmissionLink ? ` (${nextSubmissionLink})` : ""}`,
        ]
      );
    }
  }

  // Notify Staff when CEO approves / updates status
  if (isManager && nextStatus === "completed" && existing.status !== "completed") {
    await rawQuery(
      `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
       VALUES ($1, $2, 'task_approved', $3, $4, '/portals')`,
      [
        randomUUID(),
        assignedUserId,
        `Work Approved`,
        `${actor.name} approved "${nextTitle}"`,
      ]
    );
  }

  const updated = await one<Record<string, unknown>>(
    `SELECT * FROM df_tasks WHERE id = $1`,
    [id]
  );

  return jsonNoStore({
    task: updated ? mapTaskRow(updated) : null,
    updatedStaffStatus,
  });
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

  if (!canManageStaffSection(actor, String(existing.section_slug))) {
    return jsonNoStore({ error: "Not authorized." }, 403);
  }

  await rawQuery(`DELETE FROM df_tasks WHERE id = $1`, [id]);
  return jsonNoStore({ ok: true });
}
