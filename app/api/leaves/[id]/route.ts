import { randomUUID } from "node:crypto";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { one, rawQuery } from "@/lib/db";
import { mapLeaveRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

function enumerateDates(startStr: string, endStr: string): string[] {
  const result: string[] = [];
  const start = new Date(`${startStr}T00:00:00Z`);
  const end = new Date(`${endStr}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return [startStr];
  }
  const cur = new Date(start);
  let guard = 0;
  while (cur <= end && guard < 31) {
    result.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
    guard++;
  }
  return result.length ? result : [startStr];
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor || actor.portalRole === "staff") {
    return jsonNoStore(
      { error: "Only CEO or ERP Owner can review leave requests." },
      403
    );
  }

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_leave_requests WHERE id = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Leave request not found." }, 404);
  }

  const sectionSlug = existing.section_slug
    ? String(existing.section_slug)
    : null;
  if (!canManageStaffSection(actor, sectionSlug)) {
    return jsonNoStore(
      { error: "You can only review leave requests for your department." },
      403
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: "approved" | "rejected";
  };
  if (body.status !== "approved" && body.status !== "rejected") {
    return jsonNoStore({ error: "Invalid decision status." }, 400);
  }

  await rawQuery(
    `UPDATE df_leave_requests
     SET status = $1, reviewed_by_name = $2, reviewed_at = NOW()
     WHERE id = $3`,
    [body.status, actor.name, id]
  );

  // When approved, auto-mark on_leave across the leave dates in df_attendance
  if (body.status === "approved") {
    const dates = enumerateDates(
      String(existing.start_date),
      String(existing.end_date)
    );
    for (const d of dates) {
      await rawQuery(
        `INSERT INTO df_attendance (
           id, user_id, work_date, status, note, marked_by_id, marked_by_name, updated_at
         ) VALUES ($1, $2, $3, 'on_leave', $4, $5, $6, NOW())
         ON CONFLICT (user_id, work_date)
         DO UPDATE SET
           status = 'on_leave',
           note = EXCLUDED.note,
           marked_by_id = EXCLUDED.marked_by_id,
           marked_by_name = EXCLUDED.marked_by_name,
           updated_at = NOW()`,
        [
          randomUUID(),
          String(existing.user_id),
          d,
          `Approved Leave: ${String(existing.leave_type)}`,
          actor.id,
          actor.name,
        ]
      );
    }
  }

  // Notify staff member immediately
  await rawQuery(
    `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
     VALUES ($1, $2, 'leave_reviewed', $3, $4, '/portals')`,
    [
      randomUUID(),
      String(existing.user_id),
      `Leave ${body.status === "approved" ? "Approved" : "Rejected"}`,
      `Your leave (${String(existing.start_date)} → ${String(existing.end_date)}) was ${body.status} by ${actor.name}.`,
    ]
  );

  await logAudit({
    actor,
    action: `leave.${body.status}`,
    targetType: "leave",
    summary: `${body.status === "approved" ? "Approved" : "Rejected"} leave for ${String(existing.user_name)}`,
  });

  const updated = await one<Record<string, unknown>>(
    `SELECT * FROM df_leave_requests WHERE id = $1`,
    [id]
  );
  return jsonNoStore({ leave: updated ? mapLeaveRow(updated) : null });
}
