import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { one, rawQuery } from "@/lib/db";
import { mapTaskRow, mapUserRow } from "@/lib/mappers";
import type { TaskPriority } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureBootstrapped();
  const user = await getSessionUser();
  const url = new URL(request.url);
  const mineOnly = url.searchParams.get("mine") === "true";
  const section = url.searchParams.get("section")?.trim().toLowerCase();

  let taskRows: Record<string, unknown>[] = [];
  if (mineOnly) {
    if (!user) return jsonNoStore({ tasks: [] });
    taskRows = await rawQuery<Record<string, unknown>>(
      `SELECT * FROM df_tasks WHERE assigned_to_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );
  } else if (section === "bd" || section === "it") {
    taskRows = await rawQuery<Record<string, unknown>>(
      `SELECT * FROM df_tasks WHERE section_slug = $1 ORDER BY created_at DESC`,
      [section]
    );
  } else {
    taskRows = await rawQuery<Record<string, unknown>>(
      `SELECT * FROM df_tasks ORDER BY created_at DESC`
    );
  }

  const staffRows = await rawQuery<Record<string, unknown>>(
    `SELECT u.*, s.name AS section_name
     FROM df_users u
     LEFT JOIN df_sections s ON s.slug = u.section_slug
     WHERE u.portal_role = 'staff' AND u.section_slug IN ('bd', 'it')
     ORDER BY u.name ASC`
  );

  return jsonNoStore({
    tasks: taskRows.map(mapTaskRow),
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
    sectionSlug?: "bd" | "it";
    assignedToId?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
    referenceLink?: string;
  };

  let sectionSlug: "bd" | "it" =
    body.sectionSlug === "bd" ? "bd" : "it";
  if (actor.portalRole === "it_ceo") sectionSlug = "it";
  if (actor.portalRole === "bd_ceo") sectionSlug = "bd";

  if (!canManageStaffSection(actor, sectionSlug)) {
    return jsonNoStore(
      { error: "You can only assign work in your own department." },
      403
    );
  }

  const title = String(body.title ?? "").trim();
  const assignedToId = String(body.assignedToId ?? "").trim();
  if (!title || !assignedToId) {
    return jsonNoStore(
      { error: "Task title and assigned staff member are required." },
      400
    );
  }

  const assignee = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1 AND portal_role = 'staff'`,
    [assignedToId]
  );
  if (!assignee) {
    return jsonNoStore({ error: "Selected team member not found." }, 404);
  }

  const priority: TaskPriority = ["normal", "high", "urgent"].includes(
    body.priority as string
  )
    ? (body.priority as TaskPriority)
    : "normal";

  let referenceLink = String(body.referenceLink ?? "").trim();
  if (referenceLink && !/^https?:\/\//i.test(referenceLink)) {
    referenceLink = `https://${referenceLink}`;
  }

  const id = randomUUID();
  const assigneeName = String(assignee.name);

  await rawQuery(
    `INSERT INTO df_tasks (
       id, section_slug, title, description, priority, status,
       due_date, reference_link, assigned_to_id, assigned_to_name,
       assigned_by_id, assigned_by_name
     ) VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11)`,
    [
      id,
      sectionSlug,
      title,
      String(body.description ?? "").trim(),
      priority,
      body.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
        ? body.dueDate
        : null,
      referenceLink,
      assignedToId,
      assigneeName,
      actor.id,
      actor.name,
    ]
  );

  // Insert real Web Notification for the team member!
  await rawQuery(
    `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
     VALUES ($1, $2, 'task_assigned', $3, $4, '/portals')`,
    [
      randomUUID(),
      assignedToId,
      `New Work Assigned (${sectionSlug.toUpperCase()} Todo)`,
      `${actor.name} assigned you: "${title}"`,
    ]
  );

  await logAudit({
    actor,
    action: "task.assigned",
    targetType: "task",
    summary: `Assigned "${title}" to ${assigneeName} (${sectionSlug.toUpperCase()} Todo)`,
  });

  const created = await one<Record<string, unknown>>(
    `SELECT * FROM df_tasks WHERE id = $1`,
    [id]
  );

  return jsonNoStore({ task: created ? mapTaskRow(created) : null }, 201);
}
