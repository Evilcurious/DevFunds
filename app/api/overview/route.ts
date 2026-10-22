import { getSessionUser, jsonNoStore } from "@/lib/auth";
import { ensureBootstrapped, getAppSettings } from "@/lib/bootstrap";
import { getDbMode, one, rawQuery, toNum } from "@/lib/db";
import { todayInTimezone } from "@/lib/format";
import {
  mapEarningRow,
  mapSectionRow,
  mapSpendingRow,
} from "@/lib/mappers";
import type { OverviewResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return jsonNoStore({ error: "Portal login required." }, 401);
    }
    await ensureBootstrapped();
    const settings = await getAppSettings();
    const today = todayInTimezone(settings.timezone);

    const [
      earningAgg,
      spendingAgg,
      staffAgg,
      attendanceAgg,
      sectionRows,
      recentSpendingRows,
      recentEarningRows,
    ] = await Promise.all([
      one<Record<string, unknown>>(
        `SELECT COUNT(*)::int AS total_customers,
                COALESCE(SUM(amount_paid), 0) AS total_earning
         FROM df_earnings`
      ),
      one<Record<string, unknown>>(
        `SELECT COALESCE(SUM(amount), 0) AS total_spending,
                COALESCE(SUM(CASE WHEN section_slug = 'bd' THEN amount ELSE 0 END), 0) AS bd_spending,
                COALESCE(SUM(CASE WHEN section_slug = 'it' THEN amount ELSE 0 END), 0) AS it_spending
         FROM df_spending`
      ),
      one<Record<string, unknown>>(
        `SELECT COUNT(*)::int AS total_staff,
                COUNT(*) FILTER (WHERE staff_status = 'active')::int AS active_staff,
                COUNT(*) FILTER (WHERE staff_status = 'free')::int AS free_staff,
                COUNT(*) FILTER (WHERE staff_status = 'working')::int AS working_staff,
                COUNT(*) FILTER (WHERE staff_status = 'offline')::int AS offline_staff
         FROM df_users
         WHERE portal_role IN ('it_ceo', 'bd_ceo', 'staff')`
      ),
      one<Record<string, unknown>>(
        `SELECT COUNT(*) FILTER (WHERE a.status = 'present')::int AS present_today,
                COUNT(*) FILTER (WHERE a.status = 'late')::int AS late_today,
                COUNT(*) FILTER (WHERE a.status IN ('on_leave', 'half_day'))::int AS leave_today,
                COUNT(*) FILTER (WHERE a.status = 'absent')::int AS absent_today
         FROM df_users u
         LEFT JOIN df_attendance a
           ON a.user_id = u.id AND a.work_date = $1
         WHERE u.portal_role IN ('it_ceo', 'bd_ceo', 'staff')`,
        [today]
      ),
      rawQuery<Record<string, unknown>>(
        `SELECT s.*,
                (SELECT COUNT(*)::int FROM df_users u WHERE u.portal_role = 'staff' AND u.section_slug = s.slug) AS staff_count,
                (SELECT COALESCE(SUM(sp.amount), 0) FROM df_spending sp WHERE sp.section_slug = s.slug) AS spending_total
         FROM df_sections s
         ORDER BY s.sort_order ASC, s.created_at ASC`
      ),
      rawQuery<Record<string, unknown>>(
        `SELECT sp.*, sec.name AS section_name
         FROM df_spending sp
         LEFT JOIN df_sections sec ON sec.slug = sp.section_slug
         ORDER BY sp.spent_at DESC
         LIMIT 6`
      ),
      rawQuery<Record<string, unknown>>(
        `SELECT * FROM df_earnings ORDER BY earned_at DESC LIMIT 6`
      ),
    ]);

    const totalCustomers = toNum(earningAgg?.total_customers, 0);
    const totalEarning = toNum(earningAgg?.total_earning, 0);
    const totalSpending = toNum(spendingAgg?.total_spending, 0);
    const bdSpending = toNum(spendingAgg?.bd_spending, 0);
    const itSpending = toNum(spendingAgg?.it_spending, 0);
    const otherSpending = Math.max(0, totalSpending - bdSpending - itSpending);
    const netProfit = totalEarning - totalSpending;
    const profitMargin =
      totalEarning > 0 ? Math.round((netProfit / totalEarning) * 1000) / 10 : 0;

    const totalStaff = toNum(staffAgg?.total_staff, 0);
    const presentToday = toNum(attendanceAgg?.present_today, 0);
    const lateToday = toNum(attendanceAgg?.late_today, 0);
    const onLeaveToday = toNum(attendanceAgg?.leave_today, 0);
    const absentToday = toNum(attendanceAgg?.absent_today, 0);
    const unmarkedToday = Math.max(
      0,
      totalStaff - (presentToday + lateToday + onLeaveToday + absentToday)
    );

    const payload: OverviewResponse = {
      settings,
      dbMode: getDbMode(),
      metrics: {
        totalCustomers,
        totalEarning,
        totalSpending,
        bdSpending,
        itSpending,
        otherSpending,
        netProfit,
        profitMargin,
        totalStaff,
        activeStaff: toNum(staffAgg?.active_staff, 0),
        freeStaff: toNum(staffAgg?.free_staff, 0),
        workingStaff: toNum(staffAgg?.working_staff, 0),
        offlineStaff: toNum(staffAgg?.offline_staff, 0),
        todayDate: today,
        presentToday,
        lateToday,
        onLeaveToday,
        absentToday,
        unmarkedToday,
      },
      sections: sectionRows.map(mapSectionRow),
      recentSpending: recentSpendingRows.map(mapSpendingRow),
      recentEarnings: recentEarningRows.map(mapEarningRow),
    };

    return jsonNoStore(payload);
  } catch (err) {
    console.error("GET /api/overview failed:", err);
    return jsonNoStore(
      { error: "Failed to load dashboard overview." },
      500
    );
  }
}
