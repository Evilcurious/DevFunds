"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useApp } from "@/components/app-context";
import { EarningModal } from "@/components/modals/earning-modal";
import { EarningTopUpCard } from "@/components/topup-cards";
import { formatMoney } from "@/lib/format";
import type { EarningRecord } from "@/lib/types";

export default function EarningPage() {
  const { user, settings, t, toast } = useApp();
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
    if (!window.confirm(`Remove "${rec.customerName}"?`)) return;
    const res = await fetch(`/api/earnings/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Deleted");
      loadEarnings();
    }
  };

  const filtered = records.filter((rec) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${rec.customerName} ${rec.customerCompany} ${rec.projectTitle} ${rec.workLink}`
      .toLowerCase()
      .includes(q);
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("earning")}
          </h1>
          <div className="gold-line w-24" />
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="royal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addEarning")}</span>
          </button>
        )}
      </div>

      {/* Unified Revenue Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="royal-card rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-royal">
            {t("totalCustomers")}
          </div>
          <div className="mt-2 text-3xl font-bold tabular-nums">
            {totals.totalCustomers}
          </div>
        </div>

        <div className="royal-card rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            {t("totalEarning")}
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums text-emerald-400">
            {formatMoney(totals.totalEarning, settings.currency)}
          </div>
        </div>

        <div className="royal-card rounded-2xl p-5">
          <div className="text-xs font-bold uppercase tracking-widest gold-accent">
            {t("netProfit")}
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-bold tabular-nums gold-accent">
            {formatMoney(totals.netProfit, settings.currency)}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-royal" />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="royal-input w-full ps-9 py-2 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="royal-card rounded-2xl p-12 text-center text-sm text-muted-royal">
          ...
        </div>
      ) : filtered.length === 0 ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          {t("noRecords")}
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
            toast("Saved");
            loadEarnings();
          }}
          editing={editing}
          currency={settings.currency}
        />
      )}
    </div>
  );
}
