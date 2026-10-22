import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { logAudit } from "@/lib/auth";
import { ensureBootstrapped } from "@/lib/bootstrap";
import { one, toNum } from "@/lib/db";
import { SESSION_COOKIE, signSessionToken } from "@/lib/jwt";
import { mapUserRow } from "@/lib/mappers";
import type { PortalRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureBootstrapped();
    const body = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      expectedRole?: PortalRole;
    };

    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Please enter both email and password." },
        { status: 400 }
      );
    }

    const row = await one<Record<string, unknown>>(
      `SELECT u.*, s.name AS section_name
       FROM df_users u
       LEFT JOIN df_sections s ON s.slug = u.section_slug
       WHERE LOWER(u.email) = $1
       LIMIT 1`,
      [email]
    );

    if (!row || !bcrypt.compareSync(password, String(row.password_hash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const user = mapUserRow(row);

    if (body.expectedRole && user.portalRole !== body.expectedRole) {
      const portalNames: Record<PortalRole, string> = {
        erp_owner: "ERP Owner Portal",
        it_ceo: "IT CEO Portal",
        bd_ceo: "BD CEO Portal",
        staff: "Staff Portal",
      };
      return NextResponse.json(
        {
          error: `This account belongs to ${portalNames[user.portalRole]}, not ${portalNames[body.expectedRole]}.`,
          actualRole: user.portalRole,
        },
        { status: 403 }
      );
    }

    const token = await signSessionToken({
      sub: user.id,
      role: user.portalRole,
      ver: toNum(row.token_version, 1),
    });

    await logAudit({
      actor: user,
      action: "auth.login",
      targetType: "session",
      summary: `${user.name} signed in to ${user.portalRole.replace("_", " ").toUpperCase()} portal`,
    });

    const response = NextResponse.json(
      { user },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );

    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error("POST /api/auth/login failed:", err);
    return NextResponse.json(
      { error: "Unable to sign in right now." },
      { status: 500 }
    );
  }
}
