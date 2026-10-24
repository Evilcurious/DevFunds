import { getSessionUser, jsonNoStore, logAudit } from "@/lib/auth";
import { getAppSettings, normalizeSettings } from "@/lib/bootstrap";
import { getDbMode, rawQuery } from "@/lib/db";
import { mapAuditRow } from "@/lib/mappers";
import type { AppSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, user] = await Promise.all([
    getAppSettings(),
    getSessionUser(),
  ]);

  let auditLogs: ReturnType<typeof mapAuditRow>[] = [];
  if (user?.portalRole === "erp_owner") {
    const rows = await rawQuery<Record<string, unknown>>(
      `SELECT * FROM df_audit_logs ORDER BY created_at DESC LIMIT 50`
    );
    auditLogs = rows.map(mapAuditRow);
  }

  return jsonNoStore({
    settings,
    dbMode: getDbMode(),
    auditLogs,
  });
}

export async function PATCH(request: Request) {
  const actor = await getSessionUser();
  if (!actor || actor.portalRole !== "erp_owner") {
    return jsonNoStore(
      { error: "Only ERP Owner can modify global settings." },
      403
    );
  }

  const current = await getAppSettings();
  const body = (await request.json().catch(() => ({}))) as Partial<AppSettings>;

  const nextSettings = normalizeSettings({
    ...current,
    ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
    ...(body.logoUrl !== undefined ? { logoUrl: body.logoUrl } : {}),
    ...(body.currency !== undefined ? { currency: body.currency } : {}),
    ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
    ...(body.language !== undefined ? { language: body.language } : {}),
    ...(body.themeId !== undefined ? { themeId: body.themeId } : {}),
    ...(body.customTheme !== undefined ? { customTheme: body.customTheme } : {}),
    ...(body.textColorOverride !== undefined
      ? { textColorOverride: body.textColorOverride }
      : {}),
    ...(body.fontId !== undefined ? { fontId: body.fontId } : {}),
    ...(body.customFonts !== undefined ? { customFonts: body.customFonts } : {}),
  });

  await rawQuery(
    `INSERT INTO df_settings (key, value, updated_at)
     VALUES ('app', $1::jsonb, NOW())
     ON CONFLICT (key)
     DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [JSON.stringify(nextSettings)]
  );

  await logAudit({
    actor,
    action: "settings.updated",
    targetType: "settings",
    summary: `Updated studio settings (${nextSettings.companyName}, theme: ${nextSettings.themeId})`,
  });

  return jsonNoStore({ settings: nextSettings });
}
