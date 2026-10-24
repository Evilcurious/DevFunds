import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { one, rawQuery } from "@/lib/db";
import { mapUserRow } from "@/lib/mappers";
import {
  loadTasks,
  notifyLeaders,
  notifyUser,
  otherSection,
} from "@/lib/tasks";
import type { TaskPriority } from "@/lib/types";

export const dynamic = "force-dynamic";

function cleanIds(raw: unknown): string[] {
  const list = Array.isArray(raw)
    ? raw.map((v) => String(v ?? "").trim()).filter(Boolean)
    : typeof raw === "string" && raw.trim()
    ? [raw.trim()]
    : [];
  return Array.from(new Set(list));
}

export async function GET(request: Request) {
  await ensureBootstrapped();
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ error: "Portal login required." }, 401);
  }
  const url = new URL(request.url);
  const mineOnly = url.searchParams.get("mine") === "true";
  const section = url.searchParams.get("section")?.trim().toLowerCase();
  const dept = url.searchParams.get("dept")?.trim().toLowerCase();

  let whereSql = "";
  const params: unknown[] = [];

  if (mineOnly) {
    whereSql = `WHERE EXISTS (
                  SELECT 1 FROM df_task_assignees ta
                  WHERE ta.task_id = t.id AND ta.user_id = $1
                )`;
    params.push(user.id);
  } else if (dept === "bd" || dept === "it") {
    // CEO lane = my department's work + the cross-CEO requests I sent out
    whereSql = `WHERE (t.section_slug = $1 OR t.origin_section = $1)`;
    params.push(dept);
  } else if (section === "bd" || section === "it") {
    whereSql = `WHERE t.section_slug = $1`;
    params.push(section);
  }

  const staffRows = await rawQuery<Record<string, unknown>>(
    `SELECT u.*, s.name AS section_name
     FROM df_users u
     LEFT JOIN df_sections s ON s.slug = u.section_slug
     WHERE u.portal_role = 'staff' AND u.section_slug IN ('bd', 'it')
     ORDER BY u.name ASC`
  );

  return jsonNoStore({
    tasks: await loadTasks(whereSql, params, user.id),
    staff: staffRows.map(mapUserRow),
  });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor || actor.portalRole === "staff") {
    return jsonNoStore(
      { error: "Only CEO or ERP Owner can assign work." },
      403
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    mode?: "direct" | "cross";
    sectionSlug?: "bd" | "it";
    targetSection?: "bd" | "it";
    assigneeIds?: string[] | string;
    assignedToId?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    referenceLink?: string;
  };

  const mode: "direct" | "cross" = body.mode === "cross" ? "cross" : "direct";
  const title = String(body.title ?? "").trim();
  if (!title) {
    return jsonNoStore({ error: "Task title is required." }, 400);
  }

  const description = String(body.description ?? "").trim();
  const priority: TaskPriority = ["normal", "high", "urgent"].includes(
    body.priority as string
  )
    ? (body.priority as TaskPriority)
    : "normal";
  const dueDate =
    body.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
      ? body.dueDate
      : null;

  let referenceLink = String(body.referenceLink ?? "").trim();
  if (referenceLink && !/^https?:\/\//i.test(referenceLink)) {
    referenceLink = `https://${referenceLink}`;
  }

  const actorDept: "bd" | "it" | null =
    actor.portalRole === "it_ceo"
      ? "it"
      : actor.portalRole === "bd_ceo"
      ? "bd"
      : null;

  const id = randomUUID();

  // ─────────────────────────────────────────────────────────────────────────
  // 1. CROSS-CEO REQUEST: BD CEO → IT CEO (or IT CEO → BD CEO).
  //    The request lands in the other CEO's queue; they accept it and then
  //    hand the work to their own team members.
  // ─────────────────────────────────────────────────────────────────────────
  if (mode === "cross") {
    if (!actorDept) {
      return jsonNoStore(
        { error: "Only the IT CEO and BD CEO can send cross-department requests." },
        403
      );
    }
    const originSection = actorDept;
    const targetSection = otherSection(actorDept);

    await rawQuery(
      `INSERT INTO df_tasks (
         id, section_slug, title, description, priority, status, due_date, reference_link,
         assigned_to_id, assigned_to_name, assigned_by_id, assigned_by_name,
         request_kind, request_status, origin_section, requested_to_role
       ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, NULL, '', $8, $9,
                 'cross', 'pending', $10, $11)`,
      [
        id,
        targetSection,
        title,
        description,
        priority,
        dueDate,
        referenceLink,
        actor.id,
        actor.name,
        originSection,
        `${targetSection}_ceo`,
      ]
    );

    await notifyLeaders({
      section: targetSection,
      includeOwner: false,
      kind: "task_requested",
      title: `New ${originSection.toUpperCase()} → ${targetSection.toUpperCase()} Work Request`,
      body: `${actor.name} requested: "${title}" — accept it, then assign your team.`,
    });

    await logAudit({
      actor,
      action: "task.cross_requested",
      targetType: "task",
      summary: `Requested "${title}" from ${targetSection.toUpperCase()} CEO (${originSection.toUpperCase()} → ${targetSection.toUpperCase()})`,
    });

    const created = await loadTasks("WHERE t.id = $1", [id], actor.id);
    return jsonNoStore({ task: created[0] ?? null }, 201);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. DIRECT ASSIGNMENT — one work item shared with one OR MANY staff members.
  // ─────────────────────────────────────────────────────────────────────────
  let sectionSlug: "bd" | "it" =
    body.sectionSlug === "bd" ? "bd" : body.sectionSlug === "it" ? "it" : "it";
  if (actorDept) sectionSlug = actorDept;

  if (!canManageStaffSection(actor, sectionSlug)) {
    return jsonNoStore(
      { error: "You can only assign work in your own department." },
      403
    );
  }

  const assigneeIds = cleanIds(
    body.assigneeIds ?? (body.assignedToId ? [body.assignedToId] : [])
  );
  if (assigneeIds.length === 0) {
    return jsonNoStore(
      { error: "Select at least one team member for this work." },
      400
    );
  }

  const idPlaceholders = assigneeIds
    .map((_, i) => `$${i + 1}`)
    .join(", ");
  const eligible = await rawQuery<Record<string, unknown>>(
    `SELECT id, name, section_slug FROM df_users
     WHERE portal_role = 'staff' AND id IN (${idPlaceholders})`,
    assigneeIds
  );

  const valid = eligible.filter((u) => String(u.section_slug) === sectionSlug);
  if (valid.length === 0) {
    return jsonNoStore(
      {
        error: `No valid ${sectionSlug.toUpperCase()} team member selected. Members must belong to that department.`,
      },
      400
    );
  }

  await rawQuery(
    `INSERT INTO df_tasks (
       id, section_slug, title, description, priority, status, due_date, reference_link,
       assigned_to_id, assigned_to_name, assigned_by_id, assigned_by_name,
       request_kind, request_status, origin_section
     ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, 'direct', 'none', $2)`,
    [
      id,
      sectionSlug,
      title,
      description,
      priority,
      dueDate,
      referenceLink,
      String(valid[0].id),
      valid.map((u) => String(u.name)).join(", "),
      actor.id,
      actor.name,
    ]
  );

  for (const member of valid) {
    await rawQuery(
      `INSERT INTO df_task_assignees (id, task_id, user_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (task_id, user_id) DO NOTHING`,
      [randomUUID(), id, String(member.id)]
    );
    await notifyUser(
      String(member.id),
      "task_assigned",
      `New Work Assigned (${sectionSlug.toUpperCase()} Todo)`,
      `${actor.name} assigned you: "${title}"${
        valid.length > 1 ? ` (shared with ${valid.length} members)` : ""
      }`
    );
  }

  await logAudit({
    actor,
    action: "task.assigned",
    targetType: "task",
    summary: `Assigned "${title}" to ${valid
      .map((u) => String(u.name))
      .join(", ")} (${sectionSlug.toUpperCase()} Todo)`,
  });

  const created = await loadTasks("WHERE t.id = $1", [id], actor.id);
  return jsonNoStore({ task: created[0] ?? null }, 201);
}
