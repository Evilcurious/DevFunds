import {
  canManageEarnings,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { one, rawQuery } from "@/lib/db";
import { mapEarningRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!canManageEarnings(actor) || !actor) {
    return jsonNoStore(
      { error: "Only BD CEO, IT CEO, or ERP Owner can edit customer earnings." },
      403
    );
  }

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_earnings WHERE id = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Customer earning record not found." }, 404);
  }

  const body = (await request.json().catch(() => ({}))) as {
    customerName?: string;
    customerCompany?: string;
    customerContact?: string;
    projectTitle?: string;
    details?: string;
    workLink?: string;
    amountPaid?: number | string;
    paymentMethod?: string;
    departmentCredit?: string;
    earnedAt?: string;
  };

  const nextName =
    body.customerName !== undefined && body.customerName.trim()
      ? body.customerName.trim()
      : String(existing.customer_name);

  const nextAmount =
    body.amountPaid !== undefined
      ? Number(body.amountPaid)
      : Number(existing.amount_paid);
  if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
    return jsonNoStore({ error: "Payment amount must be greater than 0." }, 400);
  }

  let nextWorkLink =
    body.workLink !== undefined
      ? body.workLink.trim()
      : String(existing.work_link ?? "");
  if (nextWorkLink && !/^https?:\/\//i.test(nextWorkLink)) {
    nextWorkLink = `https://${nextWorkLink}`;
  }

  const nextEarnedAt =
    body.earnedAt && !Number.isNaN(new Date(body.earnedAt).getTime())
      ? new Date(body.earnedAt).toISOString()
      : existing.earned_at;

  await rawQuery(
    `UPDATE df_earnings
     SET customer_name = $1,
         customer_company = $2,
         customer_contact = $3,
         project_title = $4,
         details = $5,
         work_link = $6,
         amount_paid = $7,
         payment_method = $8,
         department_credit = $9,
         earned_at = $10,
         updated_at = NOW()
     WHERE id = $11`,
    [
      nextName,
      body.customerCompany !== undefined
        ? body.customerCompany.trim()
        : String(existing.customer_company ?? ""),
      body.customerContact !== undefined
        ? body.customerContact.trim()
        : String(existing.customer_contact ?? ""),
      body.projectTitle !== undefined
        ? body.projectTitle.trim()
        : String(existing.project_title ?? ""),
      body.details !== undefined
        ? body.details.trim()
        : String(existing.details ?? ""),
      nextWorkLink,
      nextAmount,
      body.paymentMethod !== undefined && body.paymentMethod.trim()
        ? body.paymentMethod.trim()
        : String(existing.payment_method ?? "Bank Transfer"),
      body.departmentCredit !== undefined && body.departmentCredit.trim()
        ? body.departmentCredit.trim()
        : String(existing.department_credit ?? "BD & IT Team"),
      nextEarnedAt,
      id,
    ]
  );

  const updated = await one<Record<string, unknown>>(
    `SELECT * FROM df_earnings WHERE id = $1`,
    [id]
  );

  await logAudit({
    actor,
    action: "earning.updated",
    targetType: "earning",
    summary: `Updated customer earning "${nextName}" (${nextAmount})`,
  });

  return jsonNoStore({ record: updated ? mapEarningRow(updated) : null });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getSessionUser();
  if (!canManageEarnings(actor) || !actor) {
    return jsonNoStore(
      { error: "Not authorized to delete customer earnings." },
      403
    );
  }

  const { id } = await context.params;
  const existing = await one<Record<string, unknown>>(
    `SELECT * FROM df_earnings WHERE id = $1`,
    [id]
  );
  if (!existing) {
    return jsonNoStore({ error: "Customer earning record not found." }, 404);
  }

  await rawQuery(`DELETE FROM df_earnings WHERE id = $1`, [id]);

  await logAudit({
    actor,
    action: "earning.deleted",
    targetType: "earning",
    summary: `Deleted customer earning "${String(existing.customer_name)}"`,
  });

  return jsonNoStore({ ok: true });
}
