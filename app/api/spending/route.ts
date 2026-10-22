import { randomUUID } from "node:crypto";
import {
  canManageSectionSpending,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped, getAppSettings } from "@/lib/bootstrap";
import { one, rawQuery, toNum } from "@/lib/db";
import { mapSectionRow, mapSpendingRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await ensureBootstrapped();
  const settings = await getAppSettings();
  const url = new URL(request.url);
  const sectionFilter = url.searchParams.get("section")?.trim().toLowerCase();

  const [spendingRows, totalsRow, sectionRows] = await Promise.all([
    sectionFilter && sectionFilter !== "total"
      ? rawQuery<Record<string, unknown>>(
          `SELECT sp.*, sec.name AS section_name
           FROM df_spending sp
           LEFT JOIN df_sections sec ON sec.slug = sp.section_slug
           WHERE sp.section_slug = $1
           ORDER BY sp.spent_at DESC`,
          [sectionFilter]
        )
      : rawQuery<Record<string, unknown>>(
          `SELECT sp.*, sec.name AS section_name
           FROM df_spending sp
           LEFT JOIN df_sections sec ON sec.slug = sp.section_slug
           ORDER BY sp.spent_at DESC`
        ),
    one<Record<string, unknown>>(
      `SELECT COALESCE(SUM(amount), 0) AS total_spending,
              COALESCE(SUM(CASE WHEN section_slug = 'bd' THEN amount ELSE 0 END), 0) AS bd_spending,
              COALESCE(SUM(CASE WHEN section_slug = 'it' THEN amount ELSE 0 END), 0) AS it_spending,
              COUNT(*)::int AS total_entries,
              COUNT(*) FILTER (WHERE section_slug = 'bd')::int AS bd_entries,
              COUNT(*) FILTER (WHERE section_slug = 'it')::int AS it_entries
       FROM df_spending`
    ),
    rawQuery<Record<string, unknown>>(
      `SELECT s.*,
              (SELECT COALESCE(SUM(sp.amount), 0) FROM df_spending sp WHERE sp.section_slug = s.slug) AS spending_total
       FROM df_sections s
       ORDER BY s.sort_order ASC`
    ),
  ]);

  return jsonNoStore({
    settings,
    totals: {
      totalSpending: toNum(totalsRow?.total_spending, 0),
      bdSpending: toNum(totalsRow?.bd_spending, 0),
      itSpending: toNum(totalsRow?.it_spending, 0),
      totalEntries: toNum(totalsRow?.total_entries, 0),
      bdEntries: toNum(totalsRow?.bd_entries, 0),
      itEntries: toNum(totalsRow?.it_entries, 0),
    },
    sections: sectionRows.map(mapSectionRow),
    records: spendingRows.map(mapSpendingRow),
  });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const body = (await request.json().catch(() => ({}))) as {
    sectionSlug?: string;
    title?: string;
    details?: string;
    category?: string;
    paymentMethod?: string;
    referenceNote?: string;
    amount?: number | string;
    spentAt?: string;
  };

  let sectionSlug = String(body.sectionSlug ?? "").trim().toLowerCase();
  if (actor.portalRole === "it_ceo") sectionSlug = "it";
  if (actor.portalRole === "bd_ceo") sectionSlug = "bd";
  if (!sectionSlug) sectionSlug = "it";

  if (!canManageSectionSpending(actor, sectionSlug)) {
    return jsonNoStore(
      {
        error: `You only have permission to add spending for your own department.`,
      },
      403
    );
  }

  const title = String(body.title ?? "").trim();
  const details = String(body.details ?? "").trim();
  const amount = Number(body.amount);

  if (!title || !Number.isFinite(amount) || amount <= 0) {
    return jsonNoStore(
      {
        error:
          "Please provide where the money was spent and a valid amount greater than 0.",
      },
      400
    );
  }

  const spentDate =
    body.spentAt && !Number.isNaN(new Date(body.spentAt).getTime())
      ? new Date(body.spentAt).toISOString()
      : new Date().toISOString();

  const id = randomUUID();
  await rawQuery(
    `INSERT INTO df_spending (
       id, section_slug, title, details, category, payment_method,
       reference_note, amount, spent_at, created_by_id, created_by_name, created_by_role
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      id,
      sectionSlug,
      title,
      details,
      String(body.category ?? "Other Operational Expense").trim() ||
        "Other Operational Expense",
      String(body.paymentMethod ?? "Bank Transfer").trim() || "Bank Transfer",
      String(body.referenceNote ?? "").trim(),
      amount,
      spentDate,
      actor.id,
      actor.name,
      actor.portalRole,
    ]
  );

  const created = await one<Record<string, unknown>>(
    `SELECT sp.*, sec.name AS section_name
     FROM df_spending sp
     LEFT JOIN df_sections sec ON sec.slug = sp.section_slug
     WHERE sp.id = $1`,
    [id]
  );

  await logAudit({
    actor,
    action: "spending.created",
    targetType: "spending",
    summary: `Added ${sectionSlug.toUpperCase()} spending "${title}" (${amount})`,
  });

  return jsonNoStore(
    { record: created ? mapSpendingRow(created) : null },
    201
  );
}
