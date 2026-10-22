"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarCheck2,
  RefreshCw,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import {
  EarningTopUpCard,
  SpendingTopUpCard,
} from "@/components/topup-cards";
import { formatMoney } from "@/lib/format";
import type { OverviewResponse } from "@/lib/types";

export default function DashboardPage() {
  const { settings, setSettings, t } = useApp();
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

  return (
    <div className="space-y-8">
      {/* Minimal Executive Title Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("dashboard")}
          </h1>
          <div className="gold-line w-28" />
        </div>

        <button
          type="button"
          onClick={() => loadOverview(true)}
          disabled={refreshing}
          className="royal-btn-outline inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link
          href="/earning"
          className="royal-card royal-card-hover rounded-2xl p-6 flex items-start justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-royal">
              {t("totalCustomers")}
            </p>
            <div className="mt-3 text-3xl font-bold tabular-nums">
              {loading ? "—" : m.totalCustomers}
            </div>
          </div>
          <UserCheck className="h-5 w-5 gold-accent shrink-0" />
        </Link>

        <Link
          href="/earning"
          className="royal-card royal-card-hover rounded-2xl p-6 flex items-start justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-royal">
              {t("totalEarning")}
            </p>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tabular-nums text-emerald-400">
              {loading ? "—" : formatMoney(m.totalEarning, currency)}
            </div>
          </div>
          <ArrowUpRight className="h-5 w-5 text-emerald-400 shrink-0" />
        </Link>

        <Link
          href="/spending"
          className="royal-card royal-card-hover rounded-2xl p-6 flex items-start justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-royal">
              {t("totalSpending")}
            </p>
            <div className="mt-3 text-2xl sm:text-3xl font-bold tabular-nums text-rose-400">
              {loading ? "—" : formatMoney(m.totalSpending, currency)}
            </div>
          </div>
          <ArrowDownRight className="h-5 w-5 text-rose-400 shrink-0" />
        </Link>

        <Link
          href="/staff"
          className="royal-card royal-card-hover rounded-2xl p-6 flex items-start justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest gold-accent">
              {t("totalStaff")}
            </p>
            <div className="mt-3 text-3xl font-bold tabular-nums">
              {loading ? "—" : m.totalStaff}
            </div>
          </div>
          <Users className="h-5 w-5 gold-accent shrink-0" />
        </Link>
      </div>

      {/* Executive Summary Bar: Net Profit + Department Spend + Today's Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 royal-card rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <TrendingUp className="h-5 w-5 gold-accent" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {t("netProfit")}
              </span>
            </div>
            <div className="text-2xl font-bold tabular-nums gold-accent">
              {formatMoney(m.netProfit, currency)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/spending?tab=bd"
              className="royal-elevated rounded-xl p-4 hover:border-[var(--accent-primary)] transition-colors"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
                {t("bdSpending")}
              </div>
              <div className="mt-1.5 text-lg font-bold tabular-nums">
                {formatMoney(m.bdSpending, currency)}
              </div>
            </Link>

            <Link
              href="/spending?tab=it"
              className="royal-elevated rounded-xl p-4 hover:border-[var(--accent-primary)] transition-colors"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
                {t("itSpending")}
              </div>
              <div className="mt-1.5 text-lg font-bold tabular-nums">
                {formatMoney(m.itSpending, currency)}
              </div>
            </Link>
          </div>
        </div>

        <Link
          href="/attendance"
          className="lg:col-span-5 royal-card royal-card-hover rounded-2xl p-6 flex flex-col justify-between gap-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CalendarCheck2 className="h-5 w-5 gold-accent" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {t("attendance")}
              </span>
            </div>
            <span className="text-xs text-muted-royal tabular-nums">
              {m.todayDate}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="royal-elevated rounded-xl p-3">
              <div className="text-xl font-bold tabular-nums text-emerald-400">
                {m.presentToday}
              </div>
              <div className="text-[11px] text-muted-royal mt-0.5">
                {t("present")}
              </div>
            </div>
            <div className="royal-elevated rounded-xl p-3">
              <div className="text-xl font-bold tabular-nums gold-accent">
                {m.onLeaveToday}
              </div>
              <div className="text-[11px] text-muted-royal mt-0.5">Leave</div>
            </div>
            <div className="royal-elevated rounded-xl p-3">
              <div className="text-xl font-bold tabular-nums text-rose-400">
                {m.absentToday}
              </div>
              <div className="text-[11px] text-muted-royal mt-0.5">Absent</div>
            </div>
          </div>
        </Link>
      </div>

      {/* Latest Entries Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{t("recentEarnings")}</h2>
            <Link
              href="/earning"
              className="text-xs font-semibold gold-accent hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>

          {!data?.recentEarnings?.length ? (
            <div className="royal-card rounded-2xl p-8 text-center text-xs text-muted-royal">
              {t("noRecords")}
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold">{t("recentSpending")}</h2>
            <Link
              href="/spending"
              className="text-xs font-semibold gold-accent hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>

          {!data?.recentSpending?.length ? (
            <div className="royal-card rounded-2xl p-8 text-center text-xs text-muted-royal">
              {t("noRecords")}
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
