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
        setError(data.error || "Could not save spending.");
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <div className="royal-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-bold">
            {editing ? "Edit Spending" : "Add Spending"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Section
              </label>
              {lockedSection ? (
                <div className="royal-elevated rounded-xl px-3.5 py-2.5 text-sm font-bold uppercase">
                  {lockedSection}
                </div>
              ) : (
                <select
                  value={sectionSlug}
                  onChange={(e) => setSectionSlug(e.target.value)}
                  className="royal-input w-full"
                >
                  <option value="bd">BD</option>
                  <option value="it">IT</option>
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Amount ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="royal-input w-full font-bold tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Spent On *
            </label>
            <input
              type="text"
              required
              placeholder="Purpose / vendor"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Details *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Spending message details..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="royal-input w-full"
              >
                {SPENDING_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="royal-input w-full"
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
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="Invoice / TXN ID"
              value={referenceNote}
              onChange={(e) => setReferenceNote(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="royal-btn-outline rounded-xl px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="royal-btn rounded-xl px-5 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
