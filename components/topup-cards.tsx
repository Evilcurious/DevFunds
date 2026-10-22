"use client";

import React, { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Link2,
  Pencil,
  Receipt,
  Trash2,
  UserCheck,
} from "lucide-react";
import { formatDateTime, formatMoney } from "@/lib/format";
import type {
  CurrencyCode,
  EarningRecord,
  SpendingRecord,
} from "@/lib/types";

export function SpendingTopUpCard({
  record,
  currency,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  record: SpendingRecord;
  currency: CurrencyCode;
  timezone?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (rec: SpendingRecord) => void;
  onDelete?: (rec: SpendingRecord) => void;
}) {
  const isBd = record.sectionSlug === "bd";
  const isIt = record.sectionSlug === "it";

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111C35] shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-blue-500/50 transition-all">
      {/* Left accent stripe */}
      <div
        className={`absolute inset-y-0 left-0 w-1.5 ${
          isBd
            ? "bg-sky-500"
            : isIt
            ? "bg-blue-600"
            : "bg-indigo-600"
        }`}
      />

      <div className="p-5 pl-6">
        {/* Top-up Receipt Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider border ${
                isBd
                  ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30"
                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30"
              }`}
            >
              <ArrowDownRight className="h-3.5 w-3.5" />
              {(record.sectionName || record.sectionSlug).toUpperCase()} SPENDING
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              <Receipt className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              {record.category}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDateTime(record.spentAt, timezone)}
            </span>
          </div>

          {/* Amount Top-up Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200/90 dark:border-rose-500/30 px-3.5 py-1.5">
            <span className="text-base sm:text-lg font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
              - {formatMoney(record.amount, currency)}
            </span>
          </div>
        </div>

        {/* Where Money Was Spent */}
        <div className="mt-3.5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            {record.title}
          </h3>

          {/* Top-up Message Bubble */}
          <div className="mt-2.5 rounded-xl bg-[#F4F8FF] dark:bg-slate-900/80 border border-blue-100/90 dark:border-slate-800 px-4 py-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {record.details ? (
              <p className="whitespace-pre-line">{record.details}</p>
            ) : (
              <p className="italic text-slate-400">
                Spent on {record.title} ({record.category})
              </p>
            )}
          </div>
        </div>

        {/* Footer Metadata + Edit/Delete */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              {record.paymentMethod}
            </span>
            {record.referenceNote && (
              <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px]">
                Ref: {record.referenceNote}
              </span>
            )}
            <span>
              Added by{" "}
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                {record.createdByName}
              </strong>
            </span>
          </div>

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-1.5">
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(record)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(record)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EarningTopUpCard({
  record,
  currency,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  record: EarningRecord;
  currency: CurrencyCode;
  timezone?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (rec: EarningRecord) => void;
  onDelete?: (rec: EarningRecord) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyWorkLink = () => {
    if (!record.workLink) return;
    navigator.clipboard?.writeText(record.workLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] shadow-xs hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500/50 transition-all">
      {/* Left accent stripe */}
      <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-blue-600 to-emerald-500" />

      <div className="p-5 pl-6">
        {/* Top-up Payment Received Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 text-white px-2.5 py-1 text-xs font-bold uppercase tracking-wider shadow-xs">
              <ArrowUpRight className="h-3.5 w-3.5" />
              SUCCESSFUL CUSTOMER
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
              {record.departmentCredit || "BD & IT Team"}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formatDateTime(record.earnedAt, timezone)}
            </span>
          </div>

          {/* Positive Payment Pill */}
          <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 px-3.5 py-1.5">
            <span className="text-base sm:text-lg font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
              + {formatMoney(record.amountPaid, currency)}
            </span>
          </div>
        </div>

        {/* Customer Info + Project Title */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 rounded-xl bg-[#F4F8FF] dark:bg-slate-900/80 border border-blue-100/90 dark:border-slate-800 p-4">
          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Customer Details
            </div>
            <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
              <UserCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>{record.customerName}</span>
            </div>
            {record.customerCompany && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>{record.customerCompany}</span>
              </div>
            )}
            {record.customerContact && (
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Contact: <span className="font-medium text-slate-700 dark:text-slate-200">{record.customerContact}</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Project / Top-Up Summary
            </div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              {record.projectTitle || "Client Project Delivery"}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed">
              {record.details || "Payment confirmed from client."}
            </p>
          </div>
        </div>

        {/* Link of Work Done by IT Team */}
        <div className="mt-3 rounded-xl border border-blue-200/90 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
              <Link2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                Work Done by IT Team
              </div>
              {record.workLink ? (
                <a
                  href={record.workLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 hover:underline max-w-md"
                >
                  {record.workLink}
                </a>
              ) : (
                <span className="text-xs italic text-slate-500 dark:text-slate-400">
                  Delivery link pending upload from IT team
                </span>
              )}
            </div>
          </div>

          {record.workLink ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyWorkLink}
                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-500/40 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
              <a
                href={record.workLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-colors"
              >
                <span>Open Delivered Work</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            canEdit &&
            onEdit && (
              <button
                type="button"
                onClick={() => onEdit(record)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white"
              >
                + Attach IT Work Link
              </button>
            )
          )}
        </div>

        {/* Footer */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
              <CreditCard className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              Paid via {record.paymentMethod}
            </span>
            <span>
              Recorded by{" "}
              <strong className="font-semibold text-slate-700 dark:text-slate-200">
                {record.createdByName}
              </strong>
            </span>
          </div>

          {(canEdit || canDelete) && (
            <div className="flex items-center gap-1.5">
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(record)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50/80 dark:bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
              {canDelete && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(record)}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-500/30 bg-rose-50/70 dark:bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
