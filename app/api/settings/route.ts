import { getSessionUser, jsonNoStore, logAudit } from "@/lib/auth";
import { getAppSettings, normalizeSettings } from "@/lib/bootstrap";
import { getDbMode, rawQuery } from "@/lib/db";
import { mapAuditRow } from "@/lib/mappers";
import type { CurrencyCode } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, user] = await Promise.all([
    getAppSettings(),
    getSessionUser(),
  ]);

  let auditLogs: ReturnType<typeof mapAuditRow>[] = [];
  if (user?.portalRole === "erp_owner") {
    const rows = await rawQuery<Record<string, unknown>>(
      `SELECT * FROM df_audit_logs ORDER BY created_at DESC LIMIT 60`
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
      { error: "Only the ERP Owner can modify workspace settings." },
      403
    );
  }

  const current = await getAppSettings();
  const body = (await request.json().catch(() => ({}))) as {
    companyName?: string;
    tagline?: string;
    currency?: CurrencyCode;
    timezone?: string;
    showSetupHint?: boolean;
  };

  const nextSettings = normalizeSettings({
    ...current,
    ...(body.companyName !== undefined ? { companyName: body.companyName } : {}),
    ...(body.tagline !== undefined ? { tagline: body.tagline } : {}),
    ...(body.currency !== undefined ? { currency: body.currency } : {}),
    ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
    ...(body.showSetupHint !== undefined
      ? { showSetupHint: body.showSetupHint }
      : {}),
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
    summary: `Updated workspace settings (${nextSettings.companyName}, currency: ${nextSettings.currency})`,
  });

  return jsonNoStore({ settings: nextSettings });
}
