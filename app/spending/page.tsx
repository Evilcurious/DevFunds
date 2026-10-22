"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowDownRight,
  Plus,
  Search,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { SpendingModal } from "@/components/modals/spending-modal";
import { SpendingTopUpCard } from "@/components/topup-cards";
import { formatMoney } from "@/lib/format";
import type { SectionRecord, SpendingRecord } from "@/lib/types";

function SpendingContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "total";

  const { user, settings, toast } = useApp();
  const [activeTab, setActiveTab] = useState<string>(
    ["bd", "it", "total"].includes(initialTab) ? initialTab : "total"
  );
  const [records, setRecords] = useState<SpendingRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [totals, setTotals] = useState({
    totalSpending: 0,
    bdSpending: 0,
    itSpending: 0,
    totalEntries: 0,
    bdEntries: 0,
    itEntries: 0,
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SpendingRecord | null>(null);

  const loadSpending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spending", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setRecords(json.records ?? []);
        setSections(json.sections ?? []);
        if (json.totals) setTotals(json.totals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSpending();
  }, [loadSpending]);

  const canAddSpending =
    user?.portalRole === "erp_owner" ||
    user?.portalRole === "it_ceo" ||
    user?.portalRole === "bd_ceo";

  const canEditRecord = (rec: SpendingRecord) => {
    if (!user) return false;
    if (user.portalRole === "erp_owner") return true;
    if (user.portalRole === "it_ceo") return rec.sectionSlug === "it";
    if (user.portalRole === "bd_ceo") return rec.sectionSlug === "bd";
    return false;
  };

  const handleDelete = async (rec: SpendingRecord) => {
    if (!window.confirm(`Delete spending "${rec.title}"?`)) return;
    const res = await fetch(`/api/spending/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Spending record deleted.");
      loadSpending();
    } else {
      toast("Could not delete spending record.", "error");
    }
  };

  const visibleRecords = records.filter((rec) => {
    if (activeTab === "bd" && rec.sectionSlug !== "bd") return false;
    if (activeTab === "it" && rec.sectionSlug !== "it") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${rec.title} ${rec.details} ${rec.category} ${rec.createdByName} ${rec.referenceNote}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const activeTotal =
    activeTab === "bd"
      ? totals.bdSpending
      : activeTab === "it"
      ? totals.itSpending
      : totals.totalSpending;

  return (
    <div className="space-y-6">
      {/* Header & Add Action */}
      <div className="rounded-3xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <ArrowDownRight className="h-4 w-4" />
              Part 2 · Department & Total Expenses
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Spending Ledger
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Switch between{" "}
              <strong className="text-slate-700 dark:text-slate-200">BD</strong>{" "}
              (added by BD CEO),{" "}
              <strong className="text-slate-700 dark:text-slate-200">IT</strong>{" "}
              (added by IT CEO), and{" "}
              <strong className="text-slate-700 dark:text-slate-200">
                Total
              </strong>{" "}
              combined spending messages.
            </p>
          </div>

          {canAddSpending ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>
                + Add{" "}
                {user?.portalRole === "it_ceo"
                  ? "IT"
                  : user?.portalRole === "bd_ceo"
                  ? "BD"
                  : ""}{" "}
                Spending
              </span>
            </button>
          ) : (
            <Link
              href="/portals"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-4 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>CEO / ERP Owner Login to Add Spending</span>
            </Link>
          )}
        </div>

        {/* THE 3 REQUIRED SPENDING SECTIONS: BD, IT, TOTAL */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("bd")}
            className={`text-left rounded-2xl border p-5 transition-all ${
              activeTab === "bd"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                : "bg-[#F6F9FF] dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-blue-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  activeTab === "bd"
                    ? "text-blue-100"
                    : "text-sky-700 dark:text-sky-300"
                }`}
              >
                1. BD Spending
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeTab === "bd"
                    ? "bg-white/20 text-white"
                    : "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300"
                }`}
              >
                {totals.bdEntries} records
              </span>
            </div>
            <div className="mt-2.5 text-2xl font-extrabold tabular-nums">
              {formatMoney(totals.bdSpending, settings.currency)}
            </div>
            <p
              className={`mt-1 text-xs ${
                activeTab === "bd"
                  ? "text-blue-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Provided via BD CEO / ERP Owner portal
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("it")}
            className={`text-left rounded-2xl border p-5 transition-all ${
              activeTab === "it"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                : "bg-[#F6F9FF] dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-blue-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  activeTab === "it"
                    ? "text-blue-100"
                    : "text-blue-700 dark:text-blue-300"
                }`}
              >
                2. IT Spending
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeTab === "it"
                    ? "bg-white/20 text-white"
                    : "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300"
                }`}
              >
                {totals.itEntries} records
              </span>
            </div>
            <div className="mt-2.5 text-2xl font-extrabold tabular-nums">
              {formatMoney(totals.itSpending, settings.currency)}
            </div>
            <p
              className={`mt-1 text-xs ${
                activeTab === "it"
                  ? "text-blue-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Provided via IT CEO / ERP Owner portal
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("total")}
            className={`text-left rounded-2xl border p-5 transition-all ${
              activeTab === "total"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                : "bg-[#F6F9FF] dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-blue-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs font-extrabold uppercase tracking-wider ${
                  activeTab === "total"
                    ? "text-blue-100"
                    : "text-slate-700 dark:text-slate-300"
                }`}
              >
                3. Total Spending (BD + IT)
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  activeTab === "total"
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {totals.totalEntries} records
              </span>
            </div>
            <div className="mt-2.5 text-2xl font-extrabold tabular-nums">
              {formatMoney(totals.totalSpending, settings.currency)}
            </div>
            <p
              className={`mt-1 text-xs ${
                activeTab === "total"
                  ? "text-blue-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              Combined feed of all spending messages
            </p>
          </button>
        </div>
      </div>

      {/* Filter Bar & Active Section Feed */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {activeTab === "bd"
              ? "BD Spending Top-Up Messages"
              : activeTab === "it"
              ? "IT Spending Top-Up Messages"
              : "Total Spending Feed (All Departments)"}{" "}
            <span className="text-blue-600 dark:text-blue-400 font-extrabold tabular-nums ml-1">
              ({formatMoney(activeTotal, settings.currency)})
            </span>
          </h2>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search where money was spent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#111C35] pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Spending Top-Up Stream */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-12 text-center text-sm text-slate-500">
          Loading spending messages...
        </div>
      ) : visibleRecords.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-12 text-center">
          <ArrowDownRight className="mx-auto h-10 w-10 text-blue-500" />
          <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
            No {activeTab === "total" ? "" : activeTab.toUpperCase() + " "}
            spending records yet
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Every expense added through the BD CEO, IT CEO, or ERP Owner portal
            appears here as a detailed top-up message showing where and how much
            money was spent.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleRecords.map((rec) => (
            <SpendingTopUpCard
              key={rec.id}
              record={rec}
              currency={settings.currency}
              timezone={settings.timezone}
              canEdit={canEditRecord(rec)}
              canDelete={canEditRecord(rec)}
              onEdit={(r) => {
                setEditing(r);
                setModalOpen(true);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {user && canAddSpending && (
        <SpendingModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            toast(
              editing
                ? "Spending top-up updated!"
                : "New spending top-up recorded!"
            );
            loadSpending();
          }}
          editing={editing}
          userRole={user.portalRole}
          defaultSection={activeTab}
          sections={sections}
          currency={settings.currency}
        />
      )}
    </div>
  );
}

export default function SpendingPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-sm text-slate-500">
          Loading Spending...
        </div>
      }
    >
      <SpendingContent />
    </Suspense>
  );
}
