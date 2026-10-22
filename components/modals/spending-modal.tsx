"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PAYMENT_METHODS, SPENDING_CATEGORIES } from "@/lib/constants";
import type {
  CurrencyCode,
  PortalRole,
  SectionRecord,
  SpendingRecord,
} from "@/lib/types";

export function SpendingModal({
  open,
  onClose,
  onSaved,
  editing,
  userRole,
  defaultSection,
  sections,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: SpendingRecord | null;
  userRole: PortalRole;
  defaultSection?: string;
  sections: SectionRecord[];
  currency: CurrencyCode;
}) {
  const lockedSection =
    userRole === "it_ceo" ? "it" : userRole === "bd_ceo" ? "bd" : null;

  const [sectionSlug, setSectionSlug] = useState("it");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [details, setDetails] = useState("");
  const [category, setCategory] = useState<string>(SPENDING_CATEGORIES[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [referenceNote, setReferenceNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      setSectionSlug(lockedSection || editing.sectionSlug);
      setTitle(editing.title);
      setAmount(String(editing.amount));
      setDetails(editing.details);
      setCategory(editing.category || SPENDING_CATEGORIES[0]);
      setPaymentMethod(editing.paymentMethod || PAYMENT_METHODS[0]);
      setReferenceNote(editing.referenceNote || "");
    } else {
      setSectionSlug(
        lockedSection ||
          (defaultSection && defaultSection !== "total" ? defaultSection : "bd")
      );
      setTitle("");
      setAmount("");
      setDetails("");
      setCategory(SPENDING_CATEGORIES[0]);
      setPaymentMethod(PAYMENT_METHODS[0]);
      setReferenceNote("");
    }
  }, [open, editing, lockedSection, defaultSection]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/spending/${editing.id}` : "/api/spending";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionSlug: lockedSection || sectionSlug,
          title,
          amount: Number(amount),
          details,
          category,
          paymentMethod,
          referenceNote,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save spending record.");
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error while saving spending.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-blue-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">
              {editing ? "Edit Spending Top-Up" : "Record New Spending"}
            </h2>
            <p className="text-xs text-blue-100">
              Appears in department section & Total Spending feed
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-blue-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/15 dark:border-rose-500/30 px-4 py-2.5 text-sm font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Section / Department
              </label>
              {lockedSection ? (
                <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-3.5 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300">
                  {lockedSection.toUpperCase()} Department (Locked)
                </div>
              ) : (
                <select
                  value={sectionSlug}
                  onChange={(e) => setSectionSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="bd">BD (Business Development)</option>
                  <option value="it">IT (Engineering & Delivery)</option>
                  {sections
                    .filter((s) => s.slug !== "bd" && s.slug !== "it")
                    .map((s) => (
                      <option key={s.id} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                How Much Spent ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Where Money Was Spent (Title) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. LinkedIn Sales Navigator & Lead Ads / Cloud Server Upgrade"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Spending Details (Top-Up Message Note) *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Write complete breakdown of where and why this amount was spent..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Expense Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                {SPENDING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Receipt / Invoice Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. INV-2026-104 or Transaction ID"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Update Spending"
                : "Save Spending Top-Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
