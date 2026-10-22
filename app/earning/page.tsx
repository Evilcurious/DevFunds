"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Search,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { EarningModal } from "@/components/modals/earning-modal";
import { EarningTopUpCard } from "@/components/topup-cards";
import { formatMoney } from "@/lib/format";
import type { EarningRecord } from "@/lib/types";

export default function EarningPage() {
  const { user, settings, toast } = useApp();
  const [records, setRecords] = useState<EarningRecord[]>([]);
  const [totals, setTotals] = useState({
    totalCustomers: 0,
    totalEarning: 0,
    totalSpending: 0,
    netProfit: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EarningRecord | null>(null);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/earnings", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setRecords(json.records ?? []);
        if (json.totals) setTotals(json.totals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const canManage =
    user?.portalRole === "erp_owner" ||
    user?.portalRole === "it_ceo" ||
    user?.portalRole === "bd_ceo";

  const handleDelete = async (rec: EarningRecord) => {
    if (
      !window.confirm(
        `Remove customer earning record for "${rec.customerName}"?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/earnings/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Customer earning record deleted.");
      loadEarnings();
    } else {
      toast("Unable to delete record.", "error");
    }
  };

  const filtered = records.filter((rec) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${rec.customerName} ${rec.customerCompany} ${rec.customerContact} ${rec.projectTitle} ${rec.details} ${rec.workLink}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Unified Header Banner */}
      <div className="rounded-3xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <ArrowUpRight className="h-4 w-4" />
              Part 3 · Single Unified Revenue & Delivered Work Ledger
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Successful Customers & Earning
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Added jointly by BD & IT leadership — displaying customer details,
              amount paid, and live link of work delivered by the IT team.
            </p>
          </div>

          {canManage ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Customer Earning</span>
            </button>
          ) : (
            <Link
              href="/portals"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-4 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>BD / IT CEO Login to Add Customer</span>
            </Link>
          )}
        </div>

        {/* Summary Strip */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-blue-100 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              <span>Successful Customers</span>
              <UserCheck className="h-4 w-4" />
            </div>
            <div className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {totals.totalCustomers}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/10 p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              <span>Total Earning Received</span>
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-emerald-800 dark:text-emerald-300">
              {formatMoney(totals.totalEarning, settings.currency)}
            </div>
          </div>

          <div className="rounded-2xl border border-blue-200/80 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/10 p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              <span>Net Profit (After Spending)</span>
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {formatMoney(totals.netProfit, settings.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Customer Payment & IT Delivery Top-Ups ({filtered.length})
        </h2>

        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, project, or IT link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C35] pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Unified Top-Up Stream */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-12 text-center text-sm text-slate-500">
          Loading customer earnings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-12 text-center">
          <UserCheck className="mx-auto h-10 w-10 text-blue-500" />
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            No successful customer entries recorded yet
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            When BD or IT adds a paid client deal, their contact details, exact
            payment amount, and live work URL appear right here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => (
            <EarningTopUpCard
              key={rec.id}
              record={rec}
              currency={settings.currency}
              timezone={settings.timezone}
              canEdit={canManage}
              canDelete={canManage}
              onEdit={(r) => {
                setEditing(r);
                setModalOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {canManage && (
        <EarningModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            toast(
              editing
                ? "Customer record updated!"
                : "New customer earning top-up added!"
            );
            loadEarnings();
          }}
          editing={editing}
          currency={settings.currency}
        />
      )}
    </div>
  );
}
