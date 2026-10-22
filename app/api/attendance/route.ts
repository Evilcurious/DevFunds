import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped, getAppSettings } from "@/lib/bootstrap";
import { one, rawQuery, toNum } from "@/lib/db";
import { todayInTimezone } from "@/lib/format";
import {
  mapAttendanceRow,
  mapLeaveRow,
  mapSectionRow,
} from "@/lib/mappers";
import type { AttendanceStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_ATTENDANCE: AttendanceStatus[] = [
  "present",
  "late",
  "half_day",
  "on_leave",
  "absent",
];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ error: "Portal login required." }, 401);
  }
  await ensureBootstrapped();
  const settings = await getAppSettings();
  // Active work day starts every day at 4:00 AM in workspace timezone!
  const today = todayInTimezone(settings.timezone);
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const workDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

  const [sectionRows, rows, monthAggRows, leaveRows] = await Promise.all([
    rawQuery<Record<string, unknown>>(
      `SELECT s.*,
              (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count
       FROM df_sections s
       ORDER BY s.sort_order ASC`
    ),
    rawQuery<Record<string, unknown>>(
      `SELECT u.id AS user_id,
              u.name AS user_name,
              u.email AS user_email,
              u.avatar_url,
              u.portal_role,
              u.job_title,
              u.joined_at,
              CASE
                WHEN u.portal_role = 'it_ceo' THEN 'it'
                WHEN u.portal_role = 'bd_ceo' THEN 'bd'
                ELSE u.section_slug
              END AS section_slug,
              s.name AS section_name,
              u.staff_status,
              a.id AS attendance_id,
              a.status AS attendance_status,
              a.check_in,
              a.check_out,
              a.note,
              a.marked_by_name,
              a.updated_at AS attendance_updated_at,
              (SELECT COUNT(*)::int
               FROM df_attendance att
               WHERE att.user_id = u.id
                 AND att.status IN ('present', 'late', 'half_day')
              ) AS present_days_count,
              (SELECT COUNT(*)::int
               FROM df_attendance attL
               WHERE attL.user_id = u.id
                 AND attL.status = 'on_leave'
              ) AS leave_days_count,
              (SELECT COUNT(*)::int
               FROM df_attendance att2
               WHERE att2.user_id = u.id
                 AND att2.status IN ('present', 'late', 'half_day', 'absent')
              ) AS total_tracked_days
       FROM df_users u
       LEFT JOIN df_sections s ON s.slug = u.section_slug
       LEFT JOIN df_attendance a ON a.user_id = u.id AND a.work_date = $1
       WHERE u.portal_role IN ('it_ceo', 'bd_ceo', 'staff')
       ORDER BY
         CASE WHEN u.portal_role IN ('it_ceo', 'bd_ceo') THEN 0 ELSE 1 END ASC,
         u.name ASC`,
      [workDate]
    ),
    rawQuery<Record<string, unknown>>(
      `SELECT COUNT(*) FILTER (WHERE status = 'present')::int AS month_present,
              COUNT(*) FILTER (WHERE status = 'late')::int AS month_late,
              COUNT(*) FILTER (WHERE status IN ('on_leave', 'half_day'))::int AS month_leave,
              COUNT(*) FILTER (WHERE status = 'absent')::int AS month_absent
       FROM df_attendance
       WHERE work_date LIKE $1`,
      [`${workDate.slice(0, 7)}%`]
    ),
    rawQuery<Record<string, unknown>>(
      `SELECT l.*, u.email AS user_email
       FROM df_leave_requests l
       LEFT JOIN df_users u ON u.id = l.user_id
       ORDER BY l.created_at DESC
       LIMIT 50`
    ),
  ]);

  const records = rows.map((r) => mapAttendanceRow(r, workDate));
  const summary = {
    totalStaff: records.length,
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    halfDay: records.filter((r) => r.status === "half_day").length,
    onLeave: records.filter((r) => r.status === "on_leave").length,
    absent: records.filter((r) => r.status === "absent").length,
    unmarked: records.filter((r) => r.status === "unmarked").length,
    monthPresent: toNum(monthAggRows[0]?.month_present, 0),
    monthLate: toNum(monthAggRows[0]?.month_late, 0),
    monthLeave: toNum(monthAggRows[0]?.month_leave, 0),
    monthAbsent: toNum(monthAggRows[0]?.month_absent, 0),
  };

  return jsonNoStore({
    workDate,
    today,
    resetSchedule: "04:00 AM",
    sections: sectionRows.map(mapSectionRow),
    summary,
    records,
    leaves: leaveRows.map(mapLeaveRow),
  });
}

export async function POST(request: Request) {
  await ensureBootstrapped();
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Portal login required." }, 401);
  }
  const settings = await getAppSettings();
  const today = todayInTimezone(settings.timezone);

  const body = (await request.json().catch(() => ({}))) as {
    action?: "present" | "check_in" | "check_out" | "mark";
    userId?: string;
    workDate?: string;
    status?: AttendanceStatus;
    note?: string;
  };

  const action = body.action ?? "present";
  const workDate =
    body.workDate && /^\d{4}-\d{2}-\d{2}$/.test(body.workDate)
      ? body.workDate
      : today;

  // One-click "Mark Present" on Attendance board (works for self, CEOs, and team members!)
  if (action === "present" || action === "check_in") {
    const targetId = String(body.userId || actor.id || "").trim();
    if (!targetId) {
      return jsonNoStore({ error: "Select a member." }, 400);
    }

    const targetUser = await one<Record<string, unknown>>(
      `SELECT * FROM df_users WHERE id = $1`,
      [targetId]
    );
    if (!targetUser) {
      return jsonNoStore({ error: "Member not found." }, 404);
    }

    const nowIso = new Date().toISOString();
    await rawQuery(
      `INSERT INTO df_attendance (
         id, user_id, work_date, status, check_in, note, marked_by_id, marked_by_name, updated_at
       ) VALUES ($1, $2, $3, 'present', $4, $5, $6, $7, NOW())
       ON CONFLICT (user_id, work_date)
       DO UPDATE SET
         status = 'present',
         check_in = COALESCE(df_attendance.check_in, EXCLUDED.check_in),
         marked_by_id = EXCLUDED.marked_by_id,
         marked_by_name = EXCLUDED.marked_by_name,
         updated_at = NOW()`,
      [
        randomUUID(),
        targetId,
        workDate,
        nowIso,
        String(body.note ?? "").trim(),
        actor.id,
        actor.name,
      ]
    );

    await logAudit({
      actor,
      action: "attendance.present",
      targetType: "attendance",
      summary: `${String(targetUser.name)} marked Present (${workDate})`,
    });

    return jsonNoStore({ ok: true, status: "present", workDate });
  }

  if (action === "check_out") {
    const targetId = String(body.userId || actor.id || "").trim();
    await rawQuery(
      `UPDATE df_attendance
       SET check_out = $1, updated_at = NOW()
       WHERE user_id = $2 AND work_date = $3`,
      [new Date().toISOString(), targetId, workDate]
    );
    return jsonNoStore({ ok: true, action: "check_out" });
  }

  const targetUserId = String(body.userId || actor.id);
  const targetUser = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1`,
    [targetUserId]
  );
  if (!targetUser) {
    return jsonNoStore({ error: "Member not found." }, 404);
  }

  const targetSection = targetUser.section_slug
    ? String(targetUser.section_slug)
    : null;

  if (
    targetUserId !== actor.id &&
    !canManageStaffSection(actor, targetSection)
  ) {
    return jsonNoStore({ error: "Not authorized." }, 403);
  }

  const status: AttendanceStatus =
    body.status && VALID_ATTENDANCE.includes(body.status)
      ? body.status
      : "present";

  const checkInStamp =
    status === "present" || status === "late" || status === "half_day"
      ? new Date().toISOString()
      : null;

  await rawQuery(
    `INSERT INTO df_attendance (
       id, user_id, work_date, status, check_in, note, marked_by_id, marked_by_name, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (user_id, work_date)
     DO UPDATE SET
       status = EXCLUDED.status,
       check_in = COALESCE(df_attendance.check_in, EXCLUDED.check_in),
       note = EXCLUDED.note,
       marked_by_id = EXCLUDED.marked_by_id,
       marked_by_name = EXCLUDED.marked_by_name,
       updated_at = NOW()`,
    [
      randomUUID(),
      targetUserId,
      workDate,
      status,
      checkInStamp,
      String(body.note ?? "").trim(),
      actor.id,
      actor.name,
    ]
  );

  await logAudit({
    actor,
    action: "attendance.marked",
    targetType: "attendance",
    summary: `Marked ${String(targetUser.name)} ${status.toUpperCase()} on ${workDate}`,
  });

  return jsonNoStore({ ok: true });
}
