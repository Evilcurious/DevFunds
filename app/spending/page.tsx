"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useApp } from "@/components/app-context";
import { SpendingModal } from "@/components/modals/spending-modal";
import { SpendingTopUpCard } from "@/components/topup-cards";
import { formatMoney } from "@/lib/format";
import type { SectionRecord, SpendingRecord } from "@/lib/types";

function SpendingContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "total";

  const { user, settings, t, toast } = useApp();
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
    if (!window.confirm(`Delete "${rec.title}"?`)) return;
    const res = await fetch(`/api/spending/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Deleted");
      loadSpending();
    }
  };

  const visibleRecords = records.filter((rec) => {
    if (activeTab === "bd" && rec.sectionSlug !== "bd") return false;
    if (activeTab === "it" && rec.sectionSlug !== "it") return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return `${rec.title} ${rec.details} ${rec.category}`
        .toLowerCase()
        .includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("spending")}
          </h1>
          <div className="gold-line w-24" />
        </div>

        {canAddSpending && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
            className="royal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{t("addSpending")}</span>
          </button>
        )}
      </div>

      {/* 3 Sections: BD, IT, Total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => setActiveTab("bd")}
          style={
            activeTab === "bd"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-5 text-start transition-all"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-muted-royal">
            BD ({totals.bdEntries})
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {formatMoney(totals.bdSpending, settings.currency)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("it")}
          style={
            activeTab === "it"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-5 text-start transition-all"
        >
          <div className="text-xs font-bold uppercase tracking-widest text-muted-royal">
            IT ({totals.itEntries})
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {formatMoney(totals.itSpending, settings.currency)}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("total")}
          style={
            activeTab === "total"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-5 text-start transition-all"
        >
          <div className="text-xs font-bold uppercase tracking-widest gold-accent">
            {t("allSpending")} ({totals.totalEntries})
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {formatMoney(totals.totalSpending, settings.currency)}
          </div>
        </button>
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
      ) : visibleRecords.length === 0 ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          {t("noRecords")}
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
            toast("Saved");
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
    <Suspense fallback={<div className="p-12 text-center text-xs">...</div>}>
      <SpendingContent />
    </Suspense>
  );
}
