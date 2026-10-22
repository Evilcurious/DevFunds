import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSessionUser, jsonNoStore, logAudit } from "@/lib/auth";
import { getAppSettings } from "@/lib/bootstrap";
import { getDbMode, one, rawQuery, toNum } from "@/lib/db";
import { SESSION_COOKIE, signSessionToken } from "@/lib/jwt";
import { mapUserRow } from "@/lib/mappers";
import type { StaffStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_STATUSES: StaffStatus[] = [
  "active",
  "free",
  "busy",
  "not_available",
];

export async function GET() {
  const [user, settings] = await Promise.all([
    getSessionUser(),
    getAppSettings(),
  ]);
  return jsonNoStore({
    user,
    settings,
    dbMode: getDbMode(),
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return jsonNoStore({ error: "Authentication required." }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    location?: string;
    skills?: string[] | string;
    bio?: string;
    freeTime?: string;
    staffStatus?: StaffStatus;
    currentPassword?: string;
    newPassword?: string;
  };

  let nextStatus = user.staffStatus;
  if (body.staffStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.staffStatus)) {
      return jsonNoStore({ error: "Invalid status value." }, 400);
    }
    nextStatus = body.staffStatus;
  }

  let nextSkills = user.skills;
  if (body.skills !== undefined) {
    if (Array.isArray(body.skills)) {
      nextSkills = body.skills
        .map((s) => String(s).trim())
        .filter(Boolean)
        .slice(0, 25);
    } else if (typeof body.skills === "string") {
      nextSkills = body.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 25);
    }
  }

  const nextName =
    body.name !== undefined && body.name.trim() ? body.name.trim() : user.name;
  const nextPhone =
    body.phone !== undefined ? body.phone.trim() : user.phone;
  const nextLocation =
    body.location !== undefined ? body.location.trim() : user.location;
  const nextBio = body.bio !== undefined ? body.bio.trim() : user.bio;
  const nextFreeTime =
    body.freeTime !== undefined ? body.freeTime.trim() : user.freeTime;

  let refreshedToken: string | null = null;

  if (body.newPassword) {
    if (body.newPassword.length < 6) {
      return jsonNoStore(
        { error: "New password must be at least 6 characters." },
        400
      );
    }
    const existing = await one<Record<string, unknown>>(
      `SELECT password_hash, token_version FROM df_users WHERE id = $1`,
      [user.id]
    );
    if (
      body.currentPassword &&
      existing &&
      !bcrypt.compareSync(body.currentPassword, String(existing.password_hash))
    ) {
      return jsonNoStore({ error: "Current password is incorrect." }, 400);
    }
    const nextVersion = toNum(existing?.token_version, 1) + 1;
    const hash = bcrypt.hashSync(body.newPassword, 10);
    await rawQuery(
      `UPDATE df_users
       SET password_hash = $1, token_version = $2, updated_at = NOW()
       WHERE id = $3`,
      [hash, nextVersion, user.id]
    );
    refreshedToken = await signSessionToken({
      sub: user.id,
      role: user.portalRole,
      ver: nextVersion,
    });
  }

  await rawQuery(
    `UPDATE df_users
     SET name = $1,
         phone = $2,
         location = $3,
         skills = $4::jsonb,
         bio = $5,
         free_time = $6,
         staff_status = $7,
         updated_at = NOW()
     WHERE id = $8`,
    [
      nextName,
      nextPhone,
      nextLocation,
      JSON.stringify(nextSkills),
      nextBio,
      nextFreeTime,
      nextStatus,
      user.id,
    ]
  );

  const updatedRow = await one<Record<string, unknown>>(
    `SELECT u.*, s.name AS section_name
     FROM df_users u
     LEFT JOIN df_sections s ON s.slug = u.section_slug
     WHERE u.id = $1`,
    [user.id]
  );

  const updatedUser = updatedRow ? mapUserRow(updatedRow) : user;

  await logAudit({
    actor: updatedUser,
    action: "profile.updated",
    targetType: "user",
    summary: `${updatedUser.name} updated profile (status: ${updatedUser.staffStatus})`,
  });

  const res = NextResponse.json(
    { user: updatedUser },
    {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
      },
    }
  );

  if (refreshedToken) {
    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");
    res.cookies.set(SESSION_COOKIE, refreshedToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return res;
}
