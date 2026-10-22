"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Pencil,
  Trash2,
} from "lucide-react";
import { useApp } from "./app-context";
import { formatDateTime } from "@/lib/format";
import type { EarningRecord, SpendingRecord } from "@/lib/types";

export function SpendingTopUpCard({
  record,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  record: SpendingRecord;
  currency?: string;
  timezone?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (rec: SpendingRecord) => void;
  onDelete?: (rec: SpendingRecord) => void;
}) {
  const { money } = useApp();

  return (
    <div className="royal-card royal-card-hover rounded-2xl p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            style={{
              borderColor: "var(--accent-secondary)",
              color: "var(--accent-secondary)",
            }}
            className="rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest"
          >
            {(record.sectionName || record.sectionSlug).toUpperCase()}
          </span>
          <span className="text-xs text-muted-royal">{record.category}</span>
          <span className="text-xs text-muted-royal opacity-75">
            · {formatDateTime(record.spentAt, timezone)}
          </span>
        </div>

        <div className="text-lg font-bold tabular-nums text-rose-400">
          − {money(record.amount)}
        </div>
      </div>

      <div>
        <h3 className="text-base font-bold">{record.title}</h3>
        {record.details && (
          <p className="mt-1.5 royal-elevated rounded-xl px-3.5 py-2.5 text-sm text-muted-royal whitespace-pre-line leading-relaxed">
            {record.details}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-muted-royal">
        <div className="flex items-center gap-3 flex-wrap">
          <span>{record.paymentMethod}</span>
          {record.referenceNote && (
            <span className="font-mono opacity-80">#{record.referenceNote}</span>
          )}
          <span>· {record.createdByName}</span>
        </div>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1.5">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(record)}
                className="royal-btn-outline rounded-lg px-2.5 py-1 text-xs inline-flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(record)}
                className="royal-btn-outline rounded-lg px-2.5 py-1 text-xs text-rose-400 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function EarningTopUpCard({
  record,
  timezone,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  record: EarningRecord;
  currency?: string;
  timezone?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (rec: EarningRecord) => void;
  onDelete?: (rec: EarningRecord) => void;
}) {
  const { money } = useApp();
  const [copied, setCopied] = useState(false);

  const copyWorkLink = () => {
    if (!record.workLink) return;
    navigator.clipboard?.writeText(record.workLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="royal-card royal-card-hover rounded-2xl p-5 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            style={{
              borderColor: "var(--accent-secondary)",
              color: "var(--accent-secondary)",
            }}
            className="rounded-md border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-widest"
          >
            {record.customerCompany || "CLIENT"}
          </span>
          <span className="text-xs text-muted-royal">
            {formatDateTime(record.earnedAt, timezone)}
          </span>
        </div>

        <div className="text-lg font-bold tabular-nums text-emerald-400">
          + {money(record.amountPaid)}
        </div>
      </div>

      <div className="royal-elevated rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="text-base font-bold">{record.customerName}</div>
          {record.customerContact && (
            <div className="text-xs text-muted-royal">
              {record.customerContact}
            </div>
          )}
        </div>

        <div className="space-y-1">
          {record.projectTitle && (
            <div className="text-sm font-semibold">{record.projectTitle}</div>
          )}
          {record.details && (
            <p className="text-xs text-muted-royal whitespace-pre-line">
              {record.details}
            </p>
          )}
        </div>
      </div>

      <div className="royal-elevated rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link2 className="h-4 w-4 shrink-0 gold-accent" />
          {record.workLink ? (
            <a
              href={record.workLink}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate text-xs sm:text-sm font-medium hover:underline max-w-md"
            >
              {record.workLink}
            </a>
          ) : (
            <span className="text-xs text-muted-royal">—</span>
          )}
        </div>

        {record.workLink ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={copyWorkLink}
              className="royal-btn-outline rounded-lg px-2.5 py-1 text-xs inline-flex items-center gap-1"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <a
              href={record.workLink}
              target="_blank"
              rel="noopener noreferrer"
              className="royal-btn rounded-lg px-3 py-1 text-xs inline-flex items-center gap-1.5"
            >
              <span>Open Work</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        ) : (
          canEdit &&
          onEdit && (
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="royal-btn rounded-lg px-3 py-1 text-xs"
            >
              + Link
            </button>
          )
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-muted-royal">
        <span>
          {record.paymentMethod} · {record.createdByName}
        </span>

        {(canEdit || canDelete) && (
          <div className="flex items-center gap-1.5">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(record)}
                className="royal-btn-outline rounded-lg px-2.5 py-1 text-xs inline-flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </button>
            )}
            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(record)}
                className="royal-btn-outline rounded-lg px-2.5 py-1 text-xs text-rose-400 inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
