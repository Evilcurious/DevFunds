"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import {
  EarningTopUpCard,
  SpendingTopUpCard,
} from "@/components/topup-cards";
import { PORTAL_META } from "@/lib/constants";
import { formatMoney } from "@/lib/format";
import type { OverviewResponse } from "@/lib/types";

export default function DashboardPage() {
  const { user, settings, setSettings } = useApp();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOverview = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch("/api/overview", { cache: "no-store" });
        if (res.ok) {
          const json = (await res.json()) as OverviewResponse;
          setData(json);
          if (json.settings) setSettings(json.settings);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setSettings]
  );

  useEffect(() => {
    loadOverview(false);
  }, [loadOverview]);

  const currency = data?.settings?.currency ?? settings.currency;
  const m = data?.metrics ?? {
    totalCustomers: 0,
    totalEarning: 0,
    totalSpending: 0,
    bdSpending: 0,
    itSpending: 0,
    otherSpending: 0,
    netProfit: 0,
    profitMargin: 0,
    totalStaff: 0,
    activeStaff: 0,
    freeStaff: 0,
    busyStaff: 0,
    unavailableStaff: 0,
    todayDate: new Date().toISOString().slice(0, 10),
    presentToday: 0,
    lateToday: 0,
    onLeaveToday: 0,
    absentToday: 0,
    unmarkedToday: 0,
  };

  const bdPct =
    m.totalSpending > 0
      ? Math.round((m.bdSpending / m.totalSpending) * 100)
      : 0;
  const itPct =
    m.totalSpending > 0
      ? Math.round((m.itSpending / m.totalSpending) * 100)
      : 0;

  return (
    <div className="space-y-7">
      {/* Top Executive Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 p-6 sm:p-8 text-white shadow-lg shadow-blue-700/15">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-blue-50 backdrop-blur-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              <span>LIVE OPERATIONS & FINANCIAL DASHBOARD</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {settings.companyName} Overview
            </h1>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
              Real-time tracking across Successful Customers, Total Earning, BD &
              IT Spending, Net Profit, Staff Directory, and Daily Attendance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            <Link
              href="/portals"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 text-sm font-bold shadow-sm transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {user
                  ? `Manage in ${PORTAL_META[user.portalRole].title}`
                  : "Open Admin / Staff Portals"}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* PART 1: THE 4 CORE KPI CARDS (Total Customers, Total Earning, Total Spending, Total Staff) */}
      <section aria-label="Core Dashboard Metrics">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Card 1: Total Customers */}
          <Link
            href="/earning"
            className="group relative overflow-hidden rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Total Customers
                </p>
                <div className="mt-3 text-3xl sm:text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : m.totalCustomers}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300">
              <span>Successful completed clients</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 2: Total Earning */}
          <Link
            href="/earning"
            className="group relative overflow-hidden rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Total Earning
                </p>
                <div className="mt-3 text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : formatMoney(m.totalEarning, currency)}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300">
              <span>View customer top-up stream</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 3: Total Spending */}
          <Link
            href="/spending"
            className="group relative overflow-hidden rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs hover:shadow-lg hover:border-blue-400 dark:hover:border-blue-500 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Total Spending
                </p>
                <div className="mt-3 text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : formatMoney(m.totalSpending, currency)}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <ArrowDownRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300">
              <span>BD + IT spending breakdown</span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Card 4: Total Staff -> Opens /staff page showing all staff with roles, contact & skills in BD & IT sections! */}
          <Link
            href="/staff"
            className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 dark:border-blue-500/40 bg-white dark:bg-[#111C35] p-6 shadow-xs hover:shadow-lg hover:border-blue-600 dark:hover:border-blue-400 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Total Staff
                </p>
                <div className="mt-3 text-3xl sm:text-4xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {loading ? "—" : m.totalStaff}
                </div>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/25 group-hover:scale-105 transition-transform">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs font-bold text-blue-700 dark:text-blue-300">
              <span>
                Click to view BD & IT sections ({m.activeStaff + m.freeStaff} available)
              </span>
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </section>

      {/* Secondary Executive Row: Net Profit Ledger + Today's Attendance Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Net Profit & Department Split */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Net Profit & Department Spending Split
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Calculated live as Total Earning minus Total Spending
                </p>
              </div>
            </div>

            <div
              className={`rounded-xl px-4 py-2 border font-extrabold text-xl tabular-nums ${
                m.netProfit >= 0
                  ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30"
                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
              }`}
            >
              {formatMoney(m.netProfit, currency)}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <Link
              href="/spending?tab=bd"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-sky-700 dark:text-sky-300">
                <span>BD Spending</span>
                <span>{bdPct}%</span>
              </div>
              <div className="mt-2 text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(m.bdSpending, currency)}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{ width: `${bdPct}%` }}
                />
              </div>
            </Link>

            <Link
              href="/spending?tab=it"
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 p-4 hover:border-blue-400 transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                <span>IT Spending</span>
                <span>{itPct}%</span>
              </div>
              <div className="mt-2 text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(m.itSpending, currency)}
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full"
                  style={{ width: `${itPct}%` }}
                />
              </div>
            </Link>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 p-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-emerald-700 dark:text-emerald-300">
                <span>Profit Margin</span>
                <Wallet className="h-3.5 w-3.5" />
              </div>
              <div className="mt-2 text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">
                {m.totalEarning > 0 ? `${m.profitMargin}%` : "0%"}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {m.totalCustomers} paid client deliveries
              </p>
            </div>
          </div>
        </div>

        {/* Today's Attendance Summary */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300">
                  <CalendarCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    Today&apos;s Attendance
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Date: {m.todayDate}
                  </p>
                </div>
              </div>

              <Link
                href="/attendance"
                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
              >
                <span>Open Sheet</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2.5 text-center">
              <div className="rounded-xl bg-emerald-50/90 dark:bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-500/25 p-3">
                <div className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {m.presentToday}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 mt-0.5">
                  Present
                </div>
              </div>
              <div className="rounded-xl bg-amber-50/90 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/25 p-3">
                <div className="text-xl font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
                  {m.lateToday}
                </div>
                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 mt-0.5">
                  Late
                </div>
              </div>
              <div className="rounded-xl bg-indigo-50/90 dark:bg-indigo-500/10 border border-indigo-200/80 dark:border-indigo-500/25 p-3">
                <div className="text-xl font-extrabold tabular-nums text-indigo-700 dark:text-indigo-300">
                  {m.onLeaveToday}
                </div>
                <div className="text-[11px] font-semibold text-indigo-800 dark:text-indigo-300 mt-0.5">
                  Leave
                </div>
              </div>
              <div className="rounded-xl bg-rose-50/90 dark:bg-rose-500/10 border border-rose-200/80 dark:border-rose-500/25 p-3">
                <div className="text-xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
                  {m.absentToday}
                </div>
                <div className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 mt-0.5">
                  Absent
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Staff Availability:{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {m.activeStaff} Active · {m.freeStaff} Free · {m.busyStaff} Busy
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Live Top-Up Feeds Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Customer Earnings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Customer Earnings
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest paid customers & IT team work links
              </p>
            </div>
            <Link
              href="/earning"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              View All Earnings <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!data?.recentEarnings?.length ? (
            <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white/80 dark:bg-[#111C35]/60 p-8 text-center">
              <UserCheck className="mx-auto h-9 w-9 text-blue-500/80" />
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                No customer earnings recorded yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                BD CEO, IT CEO, or ERP Owner can add paid customer top-ups and
                delivered IT work links anytime.
              </p>
              <Link
                href="/earning"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white"
              >
                Go to Earning Section <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.recentEarnings.slice(0, 3).map((rec) => (
                <EarningTopUpCard
                  key={rec.id}
                  record={rec}
                  currency={currency}
                  timezone={settings.timezone}
                />
              ))}
            </div>
          )}
        </div>

        {/* Latest Department Spendings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Recent Department Spending
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Latest BD & IT top-up expense messages
              </p>
            </div>
            <Link
              href="/spending"
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              View BD / IT / Total <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {!data?.recentSpending?.length ? (
            <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white/80 dark:bg-[#111C35]/60 p-8 text-center">
              <ArrowDownRight className="mx-auto h-9 w-9 text-blue-500/80" />
              <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                No department spending recorded yet
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                BD CEO records BD expenses, IT CEO records IT expenses, and ERP
                Owner manages everything.
              </p>
              <Link
                href="/spending"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-bold text-white"
              >
                Open Spending Sections <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3.5">
              {data.recentSpending.slice(0, 3).map((rec) => (
                <SpendingTopUpCard
                  key={rec.id}
                  record={rec}
                  currency={currency}
                  timezone={settings.timezone}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
