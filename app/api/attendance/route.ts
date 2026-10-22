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
  await ensureBootstrapped();
  const settings = await getAppSettings();
  const today = todayInTimezone(settings.timezone);
  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const workDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const sectionFilter = url.searchParams.get("section")?.trim().toLowerCase();

  const [sectionRows, rows, myHistoryRows, sessionUser] = await Promise.all([
    rawQuery<Record<string, unknown>>(
      `SELECT s.*,
              (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count
       FROM df_sections s
       ORDER BY s.sort_order ASC`
    ),
    sectionFilter && sectionFilter !== "all"
      ? rawQuery<Record<string, unknown>>(
          `SELECT u.id AS user_id,
                  u.name AS user_name,
                  u.email AS user_email,
                  u.job_title,
                  u.section_slug,
                  s.name AS section_name,
                  u.staff_status,
                  a.id AS attendance_id,
                  a.status AS attendance_status,
                  a.check_in,
                  a.check_out,
                  a.note,
                  a.marked_by_name,
                  a.updated_at AS attendance_updated_at
           FROM df_users u
           LEFT JOIN df_sections s ON s.slug = u.section_slug
           LEFT JOIN df_attendance a ON a.user_id = u.id AND a.work_date = $1
           WHERE u.portal_role = 'staff' AND u.section_slug = $2
           ORDER BY u.name ASC`,
          [workDate, sectionFilter]
        )
      : rawQuery<Record<string, unknown>>(
          `SELECT u.id AS user_id,
                  u.name AS user_name,
                  u.email AS user_email,
                  u.job_title,
                  u.section_slug,
                  s.name AS section_name,
                  u.staff_status,
                  a.id AS attendance_id,
                  a.status AS attendance_status,
                  a.check_in,
                  a.check_out,
                  a.note,
                  a.marked_by_name,
                  a.updated_at AS attendance_updated_at
           FROM df_users u
           LEFT JOIN df_sections s ON s.slug = u.section_slug
           LEFT JOIN df_attendance a ON a.user_id = u.id AND a.work_date = $1
           WHERE u.portal_role = 'staff'
           ORDER BY u.section_slug ASC NULLS LAST, u.name ASC`,
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
    getSessionUser(),
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
    monthPresent: toNum(myHistoryRows[0]?.month_present, 0),
    monthLate: toNum(myHistoryRows[0]?.month_late, 0),
    monthLeave: toNum(myHistoryRows[0]?.month_leave, 0),
    monthAbsent: toNum(myHistoryRows[0]?.month_absent, 0),
  };

  let selfHistory: Array<Record<string, unknown>> = [];
  if (sessionUser) {
    selfHistory = await rawQuery<Record<string, unknown>>(
      `SELECT work_date, status, check_in, check_out, note
       FROM df_attendance
       WHERE user_id = $1
       ORDER BY work_date DESC
       LIMIT 14`,
      [sessionUser.id]
    );
  }

  return jsonNoStore({
    workDate,
    today,
    sections: sectionRows.map(mapSectionRow),
    summary,
    records,
    selfHistory,
  });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const settings = await getAppSettings();
  const today = todayInTimezone(settings.timezone);

  const body = (await request.json().catch(() => ({}))) as {
    action?: "check_in" | "check_out" | "mark";
    userId?: string;
    workDate?: string;
    status?: AttendanceStatus;
    note?: string;
  };

  const action = body.action ?? "mark";
  const workDate =
    body.workDate && /^\d{4}-\d{2}-\d{2}$/.test(body.workDate)
      ? body.workDate
      : today;

  // Self Check-In / Check-Out (used by Staff Portal or own account)
  if (action === "check_in" || action === "check_out") {
    const targetId = actor.id;
    const existing = await one<Record<string, unknown>>(
      `SELECT * FROM df_attendance WHERE user_id = $1 AND work_date = $2`,
      [targetId, workDate]
    );

    if (action === "check_in") {
      const nowIso = new Date().toISOString();
      await rawQuery(
        `INSERT INTO df_attendance (
           id, user_id, work_date, status, check_in, note, marked_by_id, marked_by_name, updated_at
         ) VALUES ($1, $2, $3, 'present', $4, $5, $6, $7, NOW())
         ON CONFLICT (user_id, work_date)
         DO UPDATE SET
           check_in = COALESCE(df_attendance.check_in, EXCLUDED.check_in),
           status = CASE WHEN df_attendance.status = 'absent' THEN 'present' ELSE df_attendance.status END,
           note = CASE WHEN EXCLUDED.note <> '' THEN EXCLUDED.note ELSE df_attendance.note END,
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
        action: "attendance.checkin",
        targetType: "attendance",
        summary: `${actor.name} checked in for ${workDate}`,
      });
      return jsonNoStore({ ok: true, action: "check_in" });
    }

    if (!existing) {
      return jsonNoStore(
        { error: "Please check in first before checking out." },
        400
      );
    }

    await rawQuery(
      `UPDATE df_attendance
       SET check_out = $1, updated_at = NOW()
       WHERE user_id = $2 AND work_date = $3`,
      [new Date().toISOString(), targetId, workDate]
    );
    await logAudit({
      actor,
      action: "attendance.checkout",
      targetType: "attendance",
      summary: `${actor.name} checked out for ${workDate}`,
    });
    return jsonNoStore({ ok: true, action: "check_out" });
  }

  // Admin / CEO marking attendance for staff member
  const targetUserId = String(body.userId || actor.id);
  const targetUser = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1`,
    [targetUserId]
  );
  if (!targetUser) {
    return jsonNoStore({ error: "Staff member not found." }, 404);
  }

  const targetSection = targetUser.section_slug
    ? String(targetUser.section_slug)
    : null;

  if (
    targetUserId !== actor.id &&
    !canManageStaffSection(actor, targetSection)
  ) {
    return jsonNoStore(
      {
        error:
          "You only have permission to mark attendance for your own department.",
      },
      403
    );
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
    summary: `Marked ${String(targetUser.name)} as ${status.toUpperCase()} on ${workDate}`,
  });

  return jsonNoStore({ ok: true });
}
