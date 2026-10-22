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
  const [departmentCredit, setDepartmentCredit] = useState("BD & IT Team");
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
      setDepartmentCredit(editing.departmentCredit || "BD & IT Team");
    } else {
      setCustomerName("");
      setCustomerCompany("");
      setCustomerContact("");
      setProjectTitle("");
      setAmountPaid("");
      setWorkLink("");
      setDetails("");
      setPaymentMethod(PAYMENT_METHODS[0]);
      setDepartmentCredit("BD & IT Team");
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
          departmentCredit,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not save customer earning.");
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error while saving customer earning.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">
              {editing
                ? "Edit Successful Customer & Earning"
                : "Add Successful Customer Top-Up"}
            </h2>
            <p className="text-xs text-blue-100">
              Updates Total Customers, Total Earning, Net Profit & IT Work Link
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-blue-800 transition-colors"
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
                Customer Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tariq Mahmood / Sarah Jenkins"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                How Much Customer Paid ({currency}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="e.g. 150000"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-bold tabular-nums text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Customer Company / Brand
              </label>
              <input
                type="text"
                placeholder="e.g. Apex Logistics UK"
                value={customerCompany}
                onChange={(e) => setCustomerCompany(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Customer Contact (Email / WhatsApp)
              </label>
              <input
                type="text"
                placeholder="e.g. client@company.com / +92 300..."
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Project / Service Delivered
              </label>
              <input
                type="text"
                placeholder="e.g. Full-Stack SaaS Web Platform"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Payment Channel
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
            <label className="block text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-1.5">
              Link of Work Done by IT Team (Live Website / Repo / Figma URL)
            </label>
            <input
              type="text"
              placeholder="https://client-project.vercel.app"
              value={workLink}
              onChange={(e) => setWorkLink(e.target.value)}
              className="w-full rounded-xl border border-blue-300 dark:border-blue-500/40 bg-blue-50/40 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-medium text-slate-900 dark:text-white focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Customer & Delivery Message Details
            </label>
            <textarea
              rows={3}
              placeholder="Top-up notes: scope completed, milestones delivered by IT team, BD closer notes..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
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
                ? "Save Changes"
                : "Add Customer Earning"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
