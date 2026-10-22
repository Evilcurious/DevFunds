import {
  canManageSectionSpending,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { one, rawQuery } from "@/lib/db";
import { mapSpendingRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!actor) {
    return jsonNoStore({ error: "Sign in required." }, 401);
  }

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_spending WHERE id = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Spending record not found." }, 404);
  }

  const currentSection = String(existing.section_slug);
  if (!canManageSectionSpending(actor, currentSection)) {
    return jsonNoStore(
      { error: "You can only edit spending records for your own department." },
      403
    );
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

  let nextSection = currentSection;
  if (actor.portalRole === "erp_owner" && body.sectionSlug) {
    nextSection = body.sectionSlug.trim().toLowerCase();
  }

  const nextTitle =
    body.title !== undefined && body.title.trim()
      ? body.title.trim()
      : String(existing.title);
  const nextDetails =
    body.details !== undefined
      ? body.details.trim()
      : String(existing.details ?? "");
  const nextCategory =
    body.category !== undefined && body.category.trim()
      ? body.category.trim()
      : String(existing.category ?? "Other Operational Expense");
  const nextMethod =
    body.paymentMethod !== undefined && body.paymentMethod.trim()
      ? body.paymentMethod.trim()
      : String(existing.payment_method ?? "Bank Transfer");
  const nextRef =
    body.referenceNote !== undefined
      ? body.referenceNote.trim()
      : String(existing.reference_note ?? "");

  const nextAmount =
    body.amount !== undefined ? Number(body.amount) : Number(existing.amount);
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    return jsonNoStore({ error: "Amount must be greater than 0." }, 400);
  }

  const nextSpentAt =
    body.spentAt && !Number.isNaN(new Date(body.spentAt).getTime())
      ? new Date(body.spentAt).toISOString()
      : existing.spent_at;

  await rawQuery(
    `UPDATE df_spending
     SET section_slug = $1,
         title = $2,
         details = $3,
         category = $4,
         payment_method = $5,
         reference_note = $6,
         amount = $7,
         spent_at = $8,
         updated_at = NOW()
     WHERE id = $9`,
    [
      nextSection,
      nextTitle,
      nextDetails,
      nextCategory,
      nextMethod,
      nextRef,
      nextAmount,
      nextSpentAt,
      id,
    ]
  );

  const updated = await one<Record<string, unknown>>(
    `SELECT sp.*, sec.name AS section_name
     FROM df_spending sp
     LEFT JOIN df_sections sec ON sec.slug = sp.section_slug
     WHERE sp.id = $1`,
    [id]
  );

  await logAudit({
    actor,
    action: "spending.updated",
    targetType: "spending",
    summary: `Edited ${nextSection.toUpperCase()} spending "${nextTitle}" (${nextAmount})`,
  });

  return jsonNoStore({ record: updated ? mapSpendingRow(updated) : null });
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
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_spending WHERE id = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Spending record not found." }, 404);
  }

  if (
    actor.portalRole !== "erp_owner" &&
    !canManageSectionSpending(actor, String(existing.section_slug))
  ) {
    return jsonNoStore(
      { error: "Not authorized to delete this spending record." },
      403
    );
  }

  await rawQuery(`DELETE FROM df_spending WHERE id = $1`, [id]);

  await logAudit({
    actor,
    action: "spending.deleted",
    targetType: "spending",
    summary: `Deleted spending "${String(existing.title)}"`,
  });

  return jsonNoStore({ ok: true });
}
