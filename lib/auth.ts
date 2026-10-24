import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ensureBootstrapped } from "./bootstrap";
import { one, rawQuery, toNum } from "./db";
import { SESSION_COOKIE, verifySessionToken } from "./jwt";
import { mapUserRow } from "./mappers";
import type { PortalRole, UserRecord } from "./types";

export async function getSessionUser(): Promise<UserRecord | null> {
  await ensureBootstrapped();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const row = await one<Record<string, unknown>>(
    `SELECT u.*, s.name AS section_name
     FROM df_users u
     LEFT JOIN df_sections s ON s.slug = u.section_slug
     WHERE u.id = $1
     LIMIT 1`,
    [payload.sub]
  );
  if (!row) return null;

  if (toNum(row.token_version, 1) !== payload.ver) {
    return null;
  }

  return mapUserRow(row);
}

export function canManageSectionSpending(
  user: UserRecord | null,
  sectionSlug: string
): boolean {
  if (!user) return false;
  if (user.portalRole === "erp_owner") return true;
  if (user.portalRole === "it_ceo") return sectionSlug === "it";
  if (user.portalRole === "bd_ceo") return sectionSlug === "bd";
  return false;
}

export function canManageEarnings(user: UserRecord | null): boolean {
  if (!user) return false;
  return (
    user.portalRole === "erp_owner" ||
    user.portalRole === "it_ceo" ||
    user.portalRole === "bd_ceo"
  );
}

export function canManageStaffSection(
  user: UserRecord | null,
  sectionSlug: string | null
): boolean {
  if (!user) return false;
  if (user.portalRole === "erp_owner") return true;
  if (user.portalRole === "it_ceo") return sectionSlug === "it";
  if (user.portalRole === "bd_ceo") return sectionSlug === "bd";
  return false;
}

export function canManageSections(user: UserRecord | null): boolean {
  if (!user) return false;
  return user.portalRole === "erp_owner";
}

export async function logAudit(params: {
  actor: Pick<UserRecord, "id" | "name" | "portalRole">;
  action: string;
  targetType: string;
  summary: string;
}): Promise<void> {
  try {
    await rawQuery(
      `INSERT INTO df_audit_logs (id, actor_id, actor_name, actor_role, action, target_type, summary)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        randomUUID(),
        params.actor.id,
        params.actor.name,
        params.actor.portalRole,
        params.action,
        params.targetType,
        params.summary,
      ]
    );
  } catch {
    // Non-blocking audit logging
  }
}

export function jsonNoStore(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export function roleBadgeLabel(role: PortalRole): string {
  switch (role) {
    case "erp_owner":
      return "ERP Owner";
    case "it_ceo":
      return "IT CEO";
    case "bd_ceo":
      return "BD CEO";
    default:
      return "Staff";
  }
}
