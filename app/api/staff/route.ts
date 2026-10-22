import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped, getAppSettings } from "@/lib/bootstrap";
import { one, rawQuery } from "@/lib/db";
import { todayInTimezone } from "@/lib/format";
import { mapSectionRow, mapUserRow } from "@/lib/mappers";
import type { PortalRole, StaffStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: StaffStatus[] = [
  "working",
  "free",
  "offline",
  "active",
];

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ error: "Portal login required." }, 401);
  }
  await ensureBootstrapped();
  const settings = await getAppSettings();
  const today = todayInTimezone(settings.timezone);
  const url = new URL(request.url);
  const includeLeaders = url.searchParams.get("includeLeaders") === "true";

  const baseSelect = `
    SELECT u.*,
           s.name AS section_name,
           a.status AS today_attendance_status,
           a.check_in AS today_check_in,
           a.check_out AS today_check_out,
           (SELECT COUNT(*)::int
            FROM df_tasks tk
            WHERE tk.assigned_to_id = u.id
              AND (tk.accepted_at IS NOT NULL OR tk.status IN ('working', 'submitted', 'completed'))
           ) AS accepted_tasks_count,
           (SELECT COUNT(*)::int
            FROM df_tasks tk2
            WHERE tk2.assigned_to_id = u.id
              AND tk2.status IN ('submitted', 'completed')
           ) AS completed_tasks_count,
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
  `;

  const [sectionRows, ceoRows, userRows] = await Promise.all([
    rawQuery<Record<string, unknown>>(
      `SELECT s.*,
              (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count,
              (SELECT COALESCE(SUM(sp.amount), 0) FROM df_spending sp WHERE sp.section_slug = s.slug) AS spending_total
       FROM df_sections s
       ORDER BY s.sort_order ASC, s.created_at ASC`
    ),
    rawQuery<Record<string, unknown>>(
      `${baseSelect}
       WHERE u.portal_role IN ('it_ceo', 'bd_ceo')
       ORDER BY CASE WHEN u.portal_role = 'it_ceo' THEN 1 ELSE 2 END ASC`,
      [today]
    ),
    rawQuery<Record<string, unknown>>(
      `${baseSelect}
       ${includeLeaders ? "" : "WHERE u.portal_role = 'staff'"}
       ORDER BY u.joined_at DESC`,
      [today]
    ),
  ]);

  return jsonNoStore({
    sections: sectionRows.map(mapSectionRow),
    ceos: ceoRows.map(mapUserRow),
    staff: userRows.map(mapUserRow),
  });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }
  if (actor.portalRole === "staff") {
    return jsonNoStore(
      { error: "Staff members cannot create accounts." },
      403
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    avatarUrl?: string;
    email?: string;
    password?: string;
    portalRole?: PortalRole;
    jobTitle?: string;
    sectionSlug?: string | null;
    phone?: string;
    location?: string;
    skills?: string[] | string;
    bio?: string;
    freeTime?: string;
    staffStatus?: StaffStatus;
  };

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body.password ?? "");

  if (!name || !email || password.length < 6) {
    return jsonNoStore(
      {
        error:
          "Name, valid email, and a password of at least 6 characters are required.",
      },
      400
    );
  }

  let targetRole: PortalRole = "staff";
  let targetSection: string | null = body.sectionSlug
    ? String(body.sectionSlug).trim().toLowerCase()
    : null;

  if (actor.portalRole === "it_ceo") {
    targetRole = "staff";
    targetSection = "it";
  } else if (actor.portalRole === "bd_ceo") {
    targetRole = "staff";
    targetSection = "bd";
  } else if (actor.portalRole === "erp_owner") {
    const requestedRole = body.portalRole ?? "staff";
    if (
      ["erp_owner", "it_ceo", "bd_ceo", "staff"].includes(requestedRole)
    ) {
      targetRole = requestedRole;
    }
    if (targetRole === "it_ceo") targetSection = "it";
    if (targetRole === "bd_ceo") targetSection = "bd";
  }

  if (targetRole === "staff" && targetSection) {
    if (!canManageStaffSection(actor, targetSection)) {
      return jsonNoStore(
        { error: "You can only create staff inside your own department." },
        403
      );
    }
    await rawQuery(
      `INSERT INTO df_sections (id, slug, name, description, color, sort_order)
       VALUES ($1, $2, $3, '', 'blue', 99)
       ON CONFLICT (slug) DO NOTHING`,
      [`sec_${targetSection}`, targetSection, targetSection.toUpperCase()]
    );
  }

  const existing = await one<{ id: string }>(
    `SELECT id FROM df_users WHERE LOWER(email) = $1`,
    [email]
  );
  if (existing) {
    return jsonNoStore(
      { error: `An account with email "${email}" already exists.` },
      409
    );
  }

  const skills = Array.isArray(body.skills)
    ? body.skills.map((s) => String(s).trim()).filter(Boolean)
    : typeof body.skills === "string"
    ? body.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const status: StaffStatus =
    body.staffStatus && VALID_STATUSES.includes(body.staffStatus)
      ? body.staffStatus
      : "free";

  const id = randomUUID();
  const hash = bcrypt.hashSync(password, 10);

  await rawQuery(
    `INSERT INTO df_users (
       id, name, avatar_url, email, password_hash, portal_role, job_title,
       section_slug, phone, location, skills, bio, free_time, staff_status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14)`,
    [
      id,
      name,
      String(body.avatarUrl ?? "").trim(),
      email,
      hash,
      targetRole,
      String(body.jobTitle ?? "").trim() ||
        (targetRole === "staff"
          ? "Team Member"
          : targetRole === "it_ceo"
          ? "IT CEO"
          : targetRole === "bd_ceo"
          ? "BD CEO"
          : "ERP Owner"),
      targetSection,
      String(body.phone ?? "").trim(),
      String(body.location ?? "").trim(),
      JSON.stringify(skills),
      String(body.bio ?? "").trim(),
      String(body.freeTime ?? "").trim(),
      status,
    ]
  );

  const createdRow = await one<Record<string, unknown>>(
    `SELECT u.*, s.name AS section_name
     FROM df_users u
     LEFT JOIN df_sections s ON s.slug = u.section_slug
     WHERE u.id = $1`,
    [id]
  );

  await logAudit({
    actor,
    action: "staff.created",
    targetType: "user",
    summary: `Created ${targetRole} account for ${name} (${email})`,
  });

  return jsonNoStore(
    { staff: createdRow ? mapUserRow(createdRow) : null },
    201
  );
}
