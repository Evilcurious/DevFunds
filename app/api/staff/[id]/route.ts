import bcrypt from "bcryptjs";
import {
  canManageStaffSection,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { one, rawQuery, toNum } from "@/lib/db";
import { mapUserRow } from "@/lib/mappers";
import type { PortalRole, StaffStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: StaffStatus[] = [
  "active",
  "free",
  "busy",
  "not_available",
];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const { id } = await context.params;
  const target = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1`,
    [id]
  );
  if (!target) {
    return jsonNoStore({ error: "Account not found." }, 404);
  }

  const targetRole = String(target.portal_role) as PortalRole;
  const targetSection = target.section_slug
    ? String(target.section_slug)
    : null;

  // Enforce strict portal boundaries:
  // - erp_owner can edit ANY account (staff or CEOs)
  // - it_ceo can ONLY edit staff belonging to 'it'
  // - bd_ceo can ONLY edit staff belonging to 'bd'
  // - staff cannot edit others via /api/staff/[id] (they use PATCH /api/auth/me)
  if (actor.portalRole !== "erp_owner") {
    if (
      targetRole !== "staff" ||
      !canManageStaffSection(actor, targetSection)
    ) {
      return jsonNoStore(
        {
          error:
            "You only have permission to update staff members inside your own department.",
        },
        403
      );
    }
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    password?: string;
    jobTitle?: string;
    sectionSlug?: string | null;
    phone?: string;
    location?: string;
    skills?: string[] | string;
    bio?: string;
    freeTime?: string;
    staffStatus?: StaffStatus;
  };

  const nextName =
    body.name !== undefined && body.name.trim()
      ? body.name.trim()
      : String(target.name);
  const nextEmail =
    body.email !== undefined && body.email.trim()
      ? body.email.trim().toLowerCase()
      : String(target.email);

  if (nextEmail !== String(target.email)) {
    const emailConflict = await one<{ id: string }>(
      `SELECT id FROM df_users WHERE LOWER(email) = $1 AND id <> $2`,
      [nextEmail, id]
    );
    if (emailConflict) {
      return jsonNoStore(
        { error: `Email "${nextEmail}" is already in use.` },
        409
      );
    }
  }

  const nextTitle =
    body.jobTitle !== undefined
      ? body.jobTitle.trim()
      : String(target.job_title ?? "");
  const nextPhone =
    body.phone !== undefined ? body.phone.trim() : String(target.phone ?? "");
  const nextLocation =
    body.location !== undefined
      ? body.location.trim()
      : String(target.location ?? "");
  const nextBio =
    body.bio !== undefined ? body.bio.trim() : String(target.bio ?? "");
  const nextFreeTime =
    body.freeTime !== undefined
      ? body.freeTime.trim()
      : String(target.free_time ?? "");

  let nextStatus = (target.staff_status as StaffStatus) || "active";
  if (body.staffStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.staffStatus)) {
      return jsonNoStore({ error: "Invalid staff status." }, 400);
    }
    nextStatus = body.staffStatus;
  }

  // Only ERP Owner can reassign staff across sections
  let nextSection = targetSection;
  if (actor.portalRole === "erp_owner" && body.sectionSlug !== undefined) {
    nextSection = body.sectionSlug ? body.sectionSlug.trim() : null;
  }

  let nextSkillsJson =
    typeof target.skills === "string"
      ? target.skills
      : JSON.stringify(target.skills ?? []);
  if (body.skills !== undefined) {
    const list = Array.isArray(body.skills)
      ? body.skills.map((s) => String(s).trim()).filter(Boolean)
      : typeof body.skills === "string"
      ? body.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    nextSkillsJson = JSON.stringify(list);
  }

  if (body.password && body.password.trim()) {
    if (body.password.trim().length < 6) {
      return jsonNoStore(
        { error: "Password must be at least 6 characters." },
        400
      );
    }
    const nextHash = bcrypt.hashSync(body.password.trim(), 10);
    const nextVer = toNum(target.token_version, 1) + 1;
    await rawQuery(
      `UPDATE df_users SET password_hash = $1, token_version = $2 WHERE id = $3`,
      [nextHash, nextVer, id]
    );
  }

  await rawQuery(
    `UPDATE df_users
     SET name = $1,
         email = $2,
         job_title = $3,
         section_slug = $4,
         phone = $5,
         location = $6,
         skills = $7::jsonb,
         bio = $8,
         free_time = $9,
         staff_status = $10,
         updated_at = NOW()
     WHERE id = $11`,
    [
      nextName,
      nextEmail,
      nextTitle,
      nextSection,
      nextPhone,
      nextLocation,
      nextSkillsJson,
      nextBio,
      nextFreeTime,
      nextStatus,
      id,
    ]
  );

  const updatedRow = await one<Record<string, unknown>>(
    `SELECT u.*, s.name AS section_name
     FROM df_users u
     LEFT JOIN df_sections s ON s.slug = u.section_slug
     WHERE u.id = $1`,
    [id]
  );

  await logAudit({
    actor,
    action: "staff.updated",
    targetType: "user",
    summary: `Updated ${nextName} (status: ${nextStatus}${nextSection ? `, section: ${nextSection.toUpperCase()}` : ""})`,
  });

  return jsonNoStore({ staff: updatedRow ? mapUserRow(updatedRow) : null });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const { id } = await context.params;
  if (id === actor.id) {
    return jsonNoStore(
      { error: "You cannot delete your own active session account." },
      400
    );
  }

  const target = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1`,
    [id]
  );
  if (!target) {
    return jsonNoStore({ error: "Account not found." }, 404);
  }

  const targetRole = String(target.portal_role) as PortalRole;
  const targetSection = target.section_slug
    ? String(target.section_slug)
    : null;

  if (actor.portalRole !== "erp_owner") {
    if (
      targetRole !== "staff" ||
      !canManageStaffSection(actor, targetSection)
    ) {
      return jsonNoStore(
        { error: "Only the ERP Owner or department CEO can remove this staff member." },
        403
      );
    }
  }

  await rawQuery(`DELETE FROM df_users WHERE id = $1`, [id]);

  await logAudit({
    actor,
    action: "staff.deleted",
    targetType: "user",
    summary: `Removed ${String(target.name)} (${String(target.email)})`,
  });

  return jsonNoStore({ ok: true });
}
