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
  "working",
  "free",
  "offline",
  "active",
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
    avatarUrl?: string;
    email?: string;
    emailPassword?: string;
    phone?: string;
    location?: string;
    skills?: string[] | string;
    bio?: string;
    freeTime?: string;
    staffStatus?: StaffStatus;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };

  const existingRow = await one<Record<string, unknown>>(
    `SELECT * FROM df_users WHERE id = $1`,
    [user.id]
  );
  if (!existingRow) {
    return jsonNoStore({ error: "Account not found." }, 404);
  }

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
        .slice(0, 30);
    } else if (typeof body.skills === "string") {
      nextSkills = body.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30);
    }
  }

  const nextName =
    body.name !== undefined && body.name.trim() ? body.name.trim() : user.name;
  const nextAvatar =
    body.avatarUrl !== undefined ? body.avatarUrl.trim() : user.avatarUrl;
  const nextPhone =
    body.phone !== undefined ? body.phone.trim() : user.phone;
  const nextLocation =
    body.location !== undefined ? body.location.trim() : user.location;
  const nextBio = body.bio !== undefined ? body.bio.trim() : user.bio;
  const nextFreeTime =
    body.freeTime !== undefined ? body.freeTime.trim() : user.freeTime;

  let nextEmail = user.email;
  let refreshedToken: string | null = null;
  let currentTokenVer = toNum(existingRow.token_version, 1);

  // 1. Change Email (requires proving current password)
  if (
    body.email !== undefined &&
    body.email.trim().toLowerCase() !== user.email.toLowerCase()
  ) {
    const candidateEmail = body.email.trim().toLowerCase();
    const emailPass = String(body.emailPassword || body.currentPassword || "");
    if (!emailPass) {
      return jsonNoStore(
        { error: "Enter your current password to change email." },
        400
      );
    }
    if (!bcrypt.compareSync(emailPass, String(existingRow.password_hash))) {
      return jsonNoStore({ error: "Current password is incorrect." }, 401);
    }
    const emailExists = await one<{ id: string }>(
      `SELECT id FROM df_users WHERE LOWER(email) = $1 AND id <> $2`,
      [candidateEmail, user.id]
    );
    if (emailExists) {
      return jsonNoStore(
        { error: "This email address is already registered." },
        409
      );
    }
    nextEmail = candidateEmail;
  }

  // 2. Change Password (requires proving old password + matching new password twice)
  if (body.newPassword) {
    const oldPw = String(body.currentPassword || "");
    const newPw = String(body.newPassword || "");
    const confirmPw = String(body.confirmPassword ?? body.newPassword);

    if (!oldPw) {
      return jsonNoStore({ error: "Please enter your old password." }, 400);
    }
    if (!bcrypt.compareSync(oldPw, String(existingRow.password_hash))) {
      return jsonNoStore({ error: "Old password is incorrect." }, 401);
    }
    if (newPw.length < 6) {
      return jsonNoStore(
        { error: "New password must be at least 6 characters." },
        400
      );
    }
    if (newPw !== confirmPw) {
      return jsonNoStore(
        { error: "New password and confirm password do not match." },
        400
      );
    }

    currentTokenVer += 1;
    const hash = bcrypt.hashSync(newPw, 10);
    await rawQuery(
      `UPDATE df_users
       SET password_hash = $1, token_version = $2, updated_at = NOW()
       WHERE id = $3`,
      [hash, currentTokenVer, user.id]
    );
    refreshedToken = await signSessionToken({
      sub: user.id,
      role: user.portalRole,
      ver: currentTokenVer,
    });
  }

  await rawQuery(
    `UPDATE df_users
     SET name = $1,
         avatar_url = $2,
         email = $3,
         phone = $4,
         location = $5,
         skills = $6::jsonb,
         bio = $7,
         free_time = $8,
         staff_status = $9,
         updated_at = NOW()
     WHERE id = $10`,
    [
      nextName,
      nextAvatar,
      nextEmail,
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
    action: "account.updated",
    targetType: "user",
    summary: `${updatedUser.name} updated account settings (${updatedUser.staffStatus})`,
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
