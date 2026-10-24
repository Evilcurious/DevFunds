import { randomUUID } from "node:crypto";
import { one, rawQuery } from "./db";
import { mapTaskRow, rollupTaskStatus } from "./mappers";
import type { StaffStatus, TaskRecord, TaskStatus } from "./types";

export const TASK_LANE_SECTIONS = ["bd", "it"] as const;

export function otherSection(section: "bd" | "it"): "bd" | "it" {
  return section === "it" ? "bd" : "it";
}

export function ceoRoleForSection(section: "bd" | "it"): "it_ceo" | "bd_ceo" {
  return section === "it" ? "it_ceo" : "bd_ceo";
}

/** Load tasks (with every member assignment row attached) for the viewer. */
export async function loadTasks(
  whereSql: string,
  params: unknown[],
  viewerId: string | null,
  options: { orderBy?: string; limit?: number } = {}
): Promise<TaskRecord[]> {
  const rows = await rawQuery<Record<string, unknown>>(
    `SELECT t.* FROM df_tasks t
     ${whereSql}
     ${options.orderBy ?? "ORDER BY t.created_at DESC"}
     ${options.limit ? `LIMIT ${Math.floor(options.limit)}` : ""}`,
    params
  );

  const ids = rows.map((r) => String(r.id));
  const grouped = new Map<string, Record<string, unknown>[]>();

  if (ids.length > 0) {
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(", ");
    const assigneeRows = await rawQuery<Record<string, unknown>>(
      `SELECT ta.*, u.name, u.avatar_url, u.job_title, u.section_slug
       FROM df_task_assignees ta
       JOIN df_users u ON u.id = ta.user_id
       WHERE ta.task_id IN (${placeholders})
       ORDER BY
         CASE WHEN u.portal_role IN ('it_ceo', 'bd_ceo') THEN 0 ELSE 1 END ASC,
         u.name ASC`,
      ids
    );
    for (const a of assigneeRows) {
      const key = String(a.task_id);
      const bucket = grouped.get(key);
      if (bucket) bucket.push(a);
      else grouped.set(key, [a]);
    }
  }

  return rows.map((r) => mapTaskRow(r, grouped.get(String(r.id)) ?? [], viewerId));
}

/** Recompute the parent task status + legacy primary-assignee mirror. */
export async function syncTaskRollup(taskId: string): Promise<TaskStatus> {
  const rows = await rawQuery<{ status: string; user_id: string; name: string }>(
    `SELECT ta.status, ta.user_id, u.name
     FROM df_task_assignees ta
     JOIN df_users u ON u.id = ta.user_id
     WHERE ta.task_id = $1
     ORDER BY
       CASE WHEN u.portal_role IN ('it_ceo', 'bd_ceo') THEN 0 ELSE 1 END ASC,
       u.name ASC`,
    [taskId]
  );

  const status = rollupTaskStatus(rows.map((r) => String(r.status) as TaskStatus));
  await rawQuery(
    `UPDATE df_tasks
     SET status = $1,
         assigned_to_id = $2,
         assigned_to_name = $3,
         updated_at = NOW()
     WHERE id = $4`,
    [status, rows[0]?.user_id ?? null, rows.map((r) => r.name).join(", ") || "", taskId]
  );
  return status;
}

export async function notifyUser(
  recipientId: string,
  kind: string,
  title: string,
  body: string,
  link = "/portals"
): Promise<void> {
  await rawQuery(
    `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [randomUUID(), recipientId, kind, title, body.slice(0, 400), link]
  );
}

/** Notify a department's CEO (and optionally the ERP Owner) by section slug. */
export async function notifyLeaders(params: {
  section?: "bd" | "it" | null;
  includeOwner?: boolean;
  kind: string;
  title: string;
  body: string;
  excludeUserId?: string;
}): Promise<void> {
  const roles: string[] = [];
  if (params.section) roles.push(ceoRoleForSection(params.section));
  if (params.includeOwner || roles.length === 0) roles.push("erp_owner");

  const placeholders = roles.map((_, i) => `$${i + 1}`).join(", ");
  const leaders = await rawQuery<{ id: string }>(
    `SELECT id FROM df_users WHERE portal_role IN (${placeholders})`,
    roles
  );
  for (const leader of leaders) {
    if (params.excludeUserId && leader.id === params.excludeUserId) continue;
    await notifyUser(leader.id, params.kind, params.title, params.body);
  }
}

export async function setStaffStatus(
  userId: string,
  status: StaffStatus
): Promise<void> {
  await rawQuery(
    `UPDATE df_users SET staff_status = $1, updated_at = NOW() WHERE id = $2`,
    [status, userId]
  );
}

/**
 * After a member submits / gets approved: if they hold no other active
 * 'working' assignment anywhere, automatically flip them to 'free'.
 */
export async function releaseStaffStatusIfIdle(
  userId: string,
  exceptTaskId: string
): Promise<StaffStatus | null> {
  const otherWorking = await one<{ cnt: unknown }>(
    `SELECT COUNT(*)::int AS cnt
     FROM df_task_assignees ta
     WHERE ta.user_id = $1 AND ta.status = 'working' AND ta.task_id <> $2`,
    [userId, exceptTaskId]
  );
  const cnt = Number(otherWorking?.cnt ?? 0);
  if (Number.isFinite(cnt) && cnt > 0) return null;
  await setStaffStatus(userId, "free");
  return "free";
}
