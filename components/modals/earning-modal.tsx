"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";
import type { CurrencyCode, EarningRecord } from "@/lib/types";

export function EarningModal({
  open,
  onClose,
  onSaved,
  editing,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: EarningRecord | null;
  currency: CurrencyCode;
}) {
  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [workLink, setWorkLink] = useState("");
  const [details, setDetails] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      setCustomerName(editing.customerName);
      setCustomerCompany(editing.customerCompany);
      setCustomerContact(editing.customerContact);
      setProjectTitle(editing.projectTitle);
      setAmountPaid(String(editing.amountPaid));
      setWorkLink(editing.workLink);
      setDetails(editing.details);
      setPaymentMethod(editing.paymentMethod || PAYMENT_METHODS[0]);
    } else {
      setCustomerName("");
      setCustomerCompany("");
      setCustomerContact("");
      setProjectTitle("");
      setAmountPaid("");
      setWorkLink("");
      setDetails("");
      setPaymentMethod(PAYMENT_METHODS[0]);
    }
  }, [open, editing]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/earnings/${editing.id}` : "/api/earnings";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerCompany,
          customerContact,
          projectTitle,
          amountPaid: Number(amountPaid),
          workLink,
          details,
          paymentMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save customer.");
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
      <div className="royal-card w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-bold">
            {editing ? "Edit Customer" : "Add Customer"}
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
                Customer Name *
              </label>
              <input
                type="text"
                required
                placeholder="Client name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="royal-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Amount Paid ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="royal-input w-full font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Company
              </label>
              <input
                type="text"
                placeholder="Company / brand"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                className="royal-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Contact
              </label>
              <input
                type="text"
                placeholder="Email or phone"
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                className="royal-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Project Title
              </label>
              <input
                type="text"
                placeholder="Project name"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="royal-input w-full"
              />
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
            <label className="block text-xs font-semibold uppercase tracking-wider gold-accent mb-1.5">
              IT Team Delivered Work Link
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={workLink}
              onChange={(e) => setWorkLink(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Notes
            </label>
            <textarea
              rows={3}
              placeholder="Delivery details..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
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
