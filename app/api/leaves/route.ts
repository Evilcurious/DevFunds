import { randomUUID } from "node:crypto";
import { getSessionUser, jsonNoStore } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { one, rawQuery } from "@/lib/db";
import { mapLeaveRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureBootstrapped();
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ error: "Portal login required." }, 401);
  }

  let rows: Record<string, unknown>[] = [];
  if (user?.portalRole === "it_ceo") {
    rows = await rawQuery<Record<string, unknown>>(
      `SELECT l.*, u.email AS user_email
       FROM df_leave_requests l
       LEFT JOIN df_users u ON u.id = l.user_id
       WHERE l.section_slug = 'it'
       ORDER BY l.created_at DESC`
    );
  } else if (user?.portalRole === "bd_ceo") {
    rows = await rawQuery<Record<string, unknown>>(
      `SELECT l.*, u.email AS user_email
       FROM df_leave_requests l
       LEFT JOIN df_users u ON u.id = l.user_id
       WHERE l.section_slug = 'bd'
       ORDER BY l.created_at DESC`
    );
  } else if (user?.portalRole === "staff") {
    rows = await rawQuery<Record<string, unknown>>(
      `SELECT l.*, u.email AS user_email
       FROM df_leave_requests l
       LEFT JOIN df_users u ON u.id = l.user_id
       WHERE l.user_id = $1
       ORDER BY l.created_at DESC`,
      [user.id]
    );
  } else {
    rows = await rawQuery<Record<string, unknown>>(
      `SELECT l.*, u.email AS user_email
       FROM df_leave_requests l
       LEFT JOIN df_users u ON u.id = l.user_id
       ORDER BY l.created_at DESC`
    );
  }

  return jsonNoStore({ leaves: rows.map(mapLeaveRow) });
}

export async function POST(request: Request) {
  await ensureBootstrapped();
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return jsonNoStore({ error: "Portal login required." }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    leaveType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  const targetUserId = String(body.userId || sessionUser?.id || "").trim();
  if (!targetUserId) {
    return jsonNoStore({ error: "Please select your staff name." }, 400);
  }

  const userRow = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1`,
    [targetUserId]
  );
  if (!userRow) {
    return jsonNoStore({ error: "Staff member not found." }, 404);
  }

  // Leave may only be filed by the account holder themselves, their own
  // department CEO, or the ERP Owner — never by another team's member.
  if (targetUserId !== sessionUser.id) {
    const reviewerRole = sessionUser.portalRole;
    const targetSection = userRow.section_slug
      ? String(userRow.section_slug)
      : null;
    const allowed =
      reviewerRole === "erp_owner" ||
      (reviewerRole === "it_ceo" && targetSection === "it") ||
      (reviewerRole === "bd_ceo" && targetSection === "bd");
    if (!allowed) {
      return jsonNoStore(
        {
          error:
            "Only your own account (or your CEO / ERP Owner) can file a leave request for you.",
        },
        403
      );
    }
  }

  const startDate = String(body.startDate ?? "").trim();
  const endDate = String(body.endDate || startDate).trim();
  const reason = String(body.reason ?? "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return jsonNoStore({ error: "Valid leave dates are required." }, 400);
  }
  if (!reason) {
    return jsonNoStore({ error: "Please provide a brief reason." }, 400);
  }

  const leaveId = randomUUID();
  const sectionSlug = userRow.section_slug
    ? String(userRow.section_slug)
    : null;
  const userName = String(userRow.name);
  const leaveType = String(body.leaveType || "Casual Leave").trim();

  await rawQuery(
    `INSERT INTO df_leave_requests (
       id, user_id, user_name, section_slug, leave_type, start_date, end_date, reason, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
    [
      leaveId,
      targetUserId,
      userName,
      sectionSlug,
      leaveType,
      startDate,
      endDate,
      reason,
    ]
  );

  // Notify appropriate department CEO + ERP Owner!
  const targetLeaderRole =
    sectionSlug === "it" ? "it_ceo" : sectionSlug === "bd" ? "bd_ceo" : "";
  const leaders = await rawQuery<{ id: string }>(
    `SELECT id FROM df_users
     WHERE portal_role = 'erp_owner' OR portal_role = $1`,
    [targetLeaderRole]
  );

  for (const leader of leaders) {
    await rawQuery(
      `INSERT INTO df_notifications (id, recipient_id, kind, title, body, link)
       VALUES ($1, $2, 'leave_requested', $3, $4, '/portals')`,
      [
        randomUUID(),
        leader.id,
        `Leave Request — ${userName}`,
        `${leaveType} (${startDate} → ${endDate}): ${reason.slice(0, 120)}`,
      ]
    );
  }

  const created = await one<Record<string, unknown>>(
    `SELECT * FROM df_leave_requests WHERE id = $1`,
    [leaveId]
  );

  return jsonNoStore({ leave: created ? mapLeaveRow(created) : null }, 201);
}
