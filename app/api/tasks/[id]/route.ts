import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
} from "@/lib/auth";
import { one, rawQuery } from "@/lib/db";
import { mapTaskRow } from "@/lib/mappers";
import type { TaskPriority, TaskStatus } from "@/lib/types";

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

  const isAssignee = String(existing.assigned_to_id) === actor.id;
  const isManager = canManageStaffSection(actor, String(existing.section_slug));

  if (!isAssignee && !isManager) {
    return jsonNoStore({ error: "Not authorized to update this task." }, 403);
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: TaskStatus;
    completionNote?: string;
    title?: string;
    description?: string;
    priority?: TaskPriority;
    dueDate?: string;
  };

  const nextStatus: TaskStatus = ["pending", "in_progress", "completed"].includes(
    body.status as string
  )
    ? (body.status as TaskStatus)
    : (existing.status as TaskStatus);

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

  await rawQuery(
    `UPDATE df_tasks
     SET status = $1,
         completion_note = $2,
         title = $3,
         description = $4,
         priority = $5,
         updated_at = NOW()
     WHERE id = $6`,
    [nextStatus, nextNote, nextTitle, nextDesc, nextPriority, id]
  );

  // Notify assigner when staff completes task
  if (
    isAssignee &&
    nextStatus === "completed" &&
    existing.status !== "completed" &&
    existing.assigned_by_id
  ) {
    await rawQuery(
      `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
       VALUES ($1, $2, 'task_updated', $3, $4, '/todo')`,
      [
        randomUUID(),
        String(existing.assigned_by_id),
        `Work Completed — ${actor.name}`,
        `Completed "${nextTitle}"`,
      ]
    );
  }

  const updated = await one<Record<string, unknown>>(
    `SELECT * FROM df_tasks WHERE id = $1`,
    [id]
  );

  return jsonNoStore({ task: updated ? mapTaskRow(updated) : null });
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
