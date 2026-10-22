import { randomUUID } from "node:crypto";
import {
  canManageEarnings,
  getSessionUser,
  jsonNoStore,
  logAudit,
} from "@/lib/auth";
import { ensureBootstrapped, getAppSettings } from "@/lib/bootstrap";
import { one, rawQuery, toNum } from "@/lib/db";
import { mapEarningRow } from "@/lib/mappers";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureBootstrapped();
  const settings = await getAppSettings();

  const [rows, aggRow, spendingRow] = await Promise.all([
    rawQuery<Record<string, unknown>>(
      `SELECT * FROM df_earnings ORDER BY earned_at DESC`
    ),
    one<Record<string, unknown>>(
      `SELECT COUNT(*)::int AS total_customers,
              COALESCE(SUM(amount_paid), 0) AS total_earning
       FROM df_earnings`
    ),
    one<Record<string, unknown>>(
      `SELECT COALESCE(SUM(amount), 0) AS total_spending FROM df_spending`
    ),
  ]);

  const totalEarning = toNum(aggRow?.total_earning, 0);
  const totalSpending = toNum(spendingRow?.total_spending, 0);

  return jsonNoStore({
    settings,
    totals: {
      totalCustomers: toNum(aggRow?.total_customers, 0),
      totalEarning,
      totalSpending,
      netProfit: totalEarning - totalSpending,
    },
    records: rows.map(mapEarningRow),
  });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!canManageEarnings(actor) || !actor) {
    return jsonNoStore(
      {
        error:
          "Only BD CEO, IT CEO, or ERP Owner can record customer earnings.",
      },
      403
    );
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

  const customerName = String(body.customerName ?? "").trim();
  const amountPaid = Number(body.amountPaid);

  if (!customerName || !Number.isFinite(amountPaid) || amountPaid <= 0) {
    return jsonNoStore(
      {
        error:
          "Customer name and a valid payment amount greater than 0 are required.",
      },
      400
    );
  }

  let workLink = String(body.workLink ?? "").trim();
  if (workLink && !/^https?:\/\//i.test(workLink)) {
    workLink = `https://${workLink}`;
  }

  const earnedDate =
    body.earnedAt && !Number.isNaN(new Date(body.earnedAt).getTime())
      ? new Date(body.earnedAt).toISOString()
      : new Date().toISOString();

  const id = randomUUID();
  await rawQuery(
    `INSERT INTO df_earnings (
       id, customer_name, customer_company, customer_contact,
       project_title, details, work_link, amount_paid, payment_method,
       department_credit, earned_at, created_by_id, created_by_name, created_by_role
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      id,
      customerName,
      String(body.customerCompany ?? "").trim(),
      String(body.customerContact ?? "").trim(),
      String(body.projectTitle ?? "").trim(),
      String(body.details ?? "").trim(),
      workLink,
      amountPaid,
      String(body.paymentMethod ?? "Bank Transfer").trim() || "Bank Transfer",
      String(body.departmentCredit ?? "BD & IT Team").trim() || "BD & IT Team",
      earnedDate,
      actor.id,
      actor.name,
      actor.portalRole,
    ]
  );

  const created = await one<Record<string, unknown>>(
    `SELECT * FROM df_earnings WHERE id = $1`,
    [id]
  );

  await logAudit({
    actor,
    action: "earning.created",
    targetType: "earning",
    summary: `Added customer earning for "${customerName}" (${amountPaid})`,
  });

  return jsonNoStore(
    { record: created ? mapEarningRow(created) : null },
    201
  );
}
