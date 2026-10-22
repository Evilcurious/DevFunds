"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Database,
  FolderPlus,
  KeyRound,
  Pencil,
  Plus,
  Save,
  Settings,
  Split,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { EarningModal } from "@/components/modals/earning-modal";
import { SectionModal } from "@/components/modals/section-modal";
import { SpendingModal } from "@/components/modals/spending-modal";
import { StaffModal } from "@/components/modals/staff-modal";
import {
  EarningTopUpCard,
  SpendingTopUpCard,
} from "@/components/topup-cards";
import {
  CURRENCIES,
  PORTAL_META,
  STAFF_STATUS_META,
} from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/format";
import type {
  AuditLogRecord,
  CurrencyCode,
  EarningRecord,
  SectionRecord,
  SpendingRecord,
  StaffStatus,
  UserRecord,
} from "@/lib/types";

type TabId = "spending" | "customers" | "staff" | "settings";

export function AdminPortalView() {
  const { user, settings, setSettings, dbMode, toast } = useApp();

  const isOwner = user?.portalRole === "erp_owner";
  const deptSlug =
    user?.portalRole === "it_ceo"
      ? "it"
      : user?.portalRole === "bd_ceo"
      ? "bd"
      : null;

  const [tab, setTab] = useState<TabId>("spending");
  const [spending, setSpending] = useState<SpendingRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [accounts, setAccounts] = useState<UserRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [spendModal, setSpendModal] = useState(false);
  const [editingSpend, setEditingSpend] = useState<SpendingRecord | null>(null);

  const [earnModal, setEarnModal] = useState(false);
  const [editingEarn, setEditingEarn] = useState<EarningRecord | null>(null);

  const [staffModal, setStaffModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserRecord | null>(null);

  const [secModal, setSecModal] = useState(false);
  const [secMode, setSecMode] = useState<"create" | "divide">("create");

  // Settings / Password form state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [showSetupHint, setShowSetupHint] = useState(settings.showSetupHint);
  const [myNewPassword, setMyNewPassword] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setCompanyName(settings.companyName);
    setTagline(settings.tagline);
    setCurrency(settings.currency);
    setShowSetupHint(settings.showSetupHint);
  }, [settings]);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const spendQuery = deptSlug ? `?section=${deptSlug}` : "";
      const [spRes, eaRes, stRes, setRes] = await Promise.all([
        fetch(`/api/spending${spendQuery}`, { cache: "no-store" }),
        fetch("/api/earnings", { cache: "no-store" }),
        fetch(`/api/staff${isOwner ? "?includeLeaders=true" : ""}`, {
          cache: "no-store",
        }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);

      if (spRes.ok) {
        const spJson = await spRes.json();
        setSpending(spJson.records ?? []);
      }
      if (eaRes.ok) {
        const eaJson = await eaRes.json();
        setEarnings(eaJson.records ?? []);
      }
      if (stRes.ok) {
        const stJson = await stRes.json();
        setSections(stJson.sections ?? []);
        const rawStaff: UserRecord[] = stJson.staff ?? [];
        setAccounts(
          deptSlug
            ? rawStaff.filter(
                (u) => u.portalRole === "staff" && u.sectionSlug === deptSlug
              )
            : rawStaff
        );
      }
      if (setRes.ok) {
        const setJson = await setRes.json();
        setAuditLogs(setJson.auditLogs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [deptSlug, isOwner]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  if (!user) return null;

  const portalMeta = PORTAL_META[user.portalRole];
  const staffOnlyList = accounts.filter((a) => a.portalRole === "staff");
  const totalDeptSpending = spending.reduce((sum, r) => sum + r.amount, 0);
  const totalCustomerEarning = earnings.reduce(
    (sum, r) => sum + r.amountPaid,
    0
  );

  const handleQuickStatus = async (
    target: UserRecord,
    nextStatus: StaffStatus
  ) => {
    const res = await fetch(`/api/staff/${target.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffStatus: nextStatus }),
    });
    if (res.ok) {
      toast(
        `${target.name} status set to ${STAFF_STATUS_META[nextStatus].label}`
      );
      loadWorkspace();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Could not update status", "error");
    }
  };

  const handleDeleteSpending = async (rec: SpendingRecord) => {
    if (!window.confirm(`Delete spending "${rec.title}"?`)) return;
    const res = await fetch(`/api/spending/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Spending deleted.");
      loadWorkspace();
    }
  };

  const handleDeleteEarning = async (rec: EarningRecord) => {
    if (!window.confirm(`Delete customer earning "${rec.customerName}"?`))
      return;
    const res = await fetch(`/api/earnings/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Customer earning deleted.");
      loadWorkspace();
    }
  };

  const handleDeleteAccount = async (target: UserRecord) => {
    if (
      !window.confirm(
        `Permanently remove "${target.name}" (${target.email})?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/staff/${target.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`Removed ${target.name}`);
      loadWorkspace();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Unable to remove account", "error");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      if (isOwner) {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName,
            tagline,
            currency,
            showSetupHint,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.settings) {
          setSettings(data.settings);
          toast("Workspace settings saved!");
        }
      }

      if (myNewPassword.trim()) {
        const pwRes = await fetch("/api/auth/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newPassword: myNewPassword.trim() }),
        });
        if (pwRes.ok) {
          setMyNewPassword("");
          toast("Your password has been updated!");
        } else {
          const pwErr = await pwRes.json().catch(() => ({}));
          toast(pwErr.error || "Password update failed", "error");
        }
      }
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Executive Portal Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 p-6 sm:p-8 text-white shadow-lg shadow-blue-700/15">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              <span>{portalMeta.title}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Database className="h-3 w-3" />
                {dbMode === "neon"
                  ? "Neon PostgreSQL Connected"
                  : dbMode === "postgres"
                  ? "PostgreSQL Connected"
                  : "Local Database Active"}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              Welcome, {user.name}
            </h1>
            <p className="text-sm text-blue-100 max-w-2xl">
              {portalMeta.subtitle}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingSpend(null);
                setSpendModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-blue-700 hover:bg-blue-50 px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>
                + Add {deptSlug ? deptSlug.toUpperCase() : ""} Spending
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingEarn(null);
                setEarnModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900/40 hover:bg-blue-900/60 border border-white/25 px-4 py-2.5 text-xs sm:text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Customer Earning</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setStaffModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-900/40 hover:bg-blue-900/60 border border-white/25 px-4 py-2.5 text-xs sm:text-sm font-bold text-white"
            >
              <UserPlus className="h-4 w-4" />
              <span>
                + Create {deptSlug ? deptSlug.toUpperCase() : ""} Staff
              </span>
            </button>
          </div>
        </div>

        {/* Summary Metrics inside Portal */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 p-4">
            <div className="text-xs font-bold uppercase text-blue-100">
              {deptSlug
                ? `${deptSlug.toUpperCase()} Department Spending`
                : "Total Workspace Spending"}
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tabular-nums">
              {formatMoney(totalDeptSpending, settings.currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 p-4">
            <div className="text-xs font-bold uppercase text-blue-100">
              Successful Customers & Revenue
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tabular-nums">
              {earnings.length} Clients ·{" "}
              {formatMoney(totalCustomerEarning, settings.currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-xs border border-white/15 p-4">
            <div className="text-xs font-bold uppercase text-blue-100">
              {deptSlug
                ? `${deptSlug.toUpperCase()} Team Staff`
                : "Managed Staff & Sections"}
            </div>
            <div className="mt-1.5 text-2xl font-extrabold tabular-nums">
              {staffOnlyList.length} Staff
              {isOwner ? ` · ${sections.length} Sections` : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Portal Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-2 shadow-xs">
        <button
          type="button"
          onClick={() => setTab("spending")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            tab === "spending"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800"
          }`}
        >
          <ArrowDownRight className="h-4 w-4" />
          <span>
            {deptSlug ? `${deptSlug.toUpperCase()} Spending` : "All Spending"} (
            {spending.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("customers")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            tab === "customers"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800"
          }`}
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>Customers & IT Links ({earnings.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("staff")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            tab === "staff"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>
            {deptSlug
              ? `${deptSlug.toUpperCase()} Staff & Status`
              : "Sections, CEOs & Staff"}{" "}
            ({accounts.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("settings")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            tab === "settings"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-800"
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>{isOwner ? "Settings & Audit Log" : "Portal Security"}</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-12 text-center text-sm text-slate-500">
          Loading portal data...
        </div>
      ) : tab === "spending" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {deptSlug
                ? `${deptSlug.toUpperCase()} Spending Top-Ups`
                : "All Department Spending Top-Ups"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingSpend(null);
                setSpendModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Spending Top-Up
            </button>
          </div>

          {spending.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-10 text-center text-sm text-slate-500">
              No spending entries recorded yet. Click{" "}
              <strong>Add Spending Top-Up</strong> above to add your first entry.
            </div>
          ) : (
            <div className="space-y-4">
              {spending.map((rec) => (
                <SpendingTopUpCard
                  key={rec.id}
                  record={rec}
                  currency={settings.currency}
                  timezone={settings.timezone}
                  canEdit
                  canDelete
                  onEdit={(r) => {
                    setEditingSpend(r);
                    setSpendModal(true);
                  }}
                  onDelete={handleDeleteSpending}
                />
              ))}
            </div>
          )}
        </div>
      ) : tab === "customers" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Successful Customers & Delivered IT Work Links
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingEarn(null);
                setEarnModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Add Customer Earning
            </button>
          </div>

          {earnings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-10 text-center text-sm text-slate-500">
              No paid customer entries recorded yet. Click{" "}
              <strong>Add Customer Earning</strong> above to log customer
              details, payment amount, and IT work link.
            </div>
          ) : (
            <div className="space-y-4">
              {earnings.map((rec) => (
                <EarningTopUpCard
                  key={rec.id}
                  record={rec}
                  currency={settings.currency}
                  timezone={settings.timezone}
                  canEdit
                  canDelete
                  onEdit={(r) => {
                    setEditingEarn(r);
                    setEarnModal(true);
                  }}
                  onDelete={handleDeleteEarning}
                />
              ))}
            </div>
          )}
        </div>
      ) : tab === "staff" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {deptSlug
                  ? `${deptSlug.toUpperCase()} Staff Accounts & Status Control`
                  : "All Portal Accounts, Staff & Sections"}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Create staff accounts and click any status pill to switch between
                Active, Free, Busy, or Not Available.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSecMode("create");
                      setSecModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-3.5 py-2 text-xs font-bold text-blue-700 dark:text-blue-300"
                  >
                    <FolderPlus className="h-4 w-4" />
                    + Add Section
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSecMode("divide");
                      setSecModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200"
                  >
                    <Split className="h-4 w-4 text-blue-600" />
                    Divide / Move Staff
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setEditingAccount(null);
                  setStaffModal(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs sm:text-sm font-bold text-white"
              >
                <UserPlus className="h-4 w-4" />+ Create Account
              </button>
            </div>
          </div>

          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-10 text-center text-sm text-slate-500">
              No staff accounts created yet in this department. Click{" "}
              <strong>+ Create Account</strong> to add your first team member.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => {
                const stMeta = STAFF_STATUS_META[acc.staffStatus];
                return (
                  <div
                    key={acc.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            {acc.name}
                          </h3>
                          <span className="rounded-md bg-blue-50 dark:bg-blue-500/15 px-2 py-0.5 text-[11px] font-bold uppercase text-blue-700 dark:text-blue-300">
                            {PORTAL_META[acc.portalRole].shortTitle}
                          </span>
                          {acc.sectionSlug && (
                            <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600 dark:text-slate-300">
                              {acc.sectionName || acc.sectionSlug}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {acc.jobTitle} · {acc.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAccount(acc);
                            setStaffModal(true);
                          }}
                          className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600"
                          title="Edit Details / Reset Password"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {acc.id !== user.id && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(acc)}
                            className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                            title="Delete Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 4-button Status Switcher: Active, Free, Busy, Not Available */}
                    {acc.portalRole === "staff" && (
                      <div className="rounded-xl bg-[#F6F9FF] dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 p-3">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            Current Staff Status:
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-bold ${stMeta.pillClass}`}
                          >
                            {stMeta.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {(
                            [
                              "active",
                              "free",
                              "busy",
                              "not_available",
                            ] as StaffStatus[]
                          ).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleQuickStatus(acc, st)}
                              className={`rounded-lg py-1.5 px-2 text-xs font-bold transition-colors ${
                                acc.staffStatus === st
                                  ? "bg-blue-600 text-white"
                                  : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-400"
                              }`}
                            >
                              {STAFF_STATUS_META[st].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Settings & Audit Logs Tab */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveSettings}
            className="lg:col-span-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 space-y-4 shadow-xs"
          >
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-600" />
              <span>
                {isOwner
                  ? "Workspace Settings & Security"
                  : "Update My CEO Password"}
              </span>
            </h2>

            {isOwner && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Workspace / Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                    Display Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value as CurrencyCode)
                    }
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    {Object.values(CURRENCIES).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 pt-1">
                  <input
                    type="checkbox"
                    checked={showSetupHint}
                    onChange={(e) => setShowSetupHint(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>
                    Show initial setup login hint card on the Portal sign-in screen
                  </span>
                </label>
              </>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Change My Portal Password
              </label>
              <input
                type="password"
                minLength={6}
                placeholder="Enter new password (min 6 characters)"
                value={myNewPassword}
                onChange={(e) => setMyNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              <Save className="h-4 w-4" />
              <span>{savingSettings ? "Saving..." : "Save Changes"}</span>
            </button>
          </form>

          {isOwner && (
            <div className="lg:col-span-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                Recent Audit Trail
              </h2>
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-500">No audit entries yet.</p>
              ) : (
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3.5 py-2.5 text-xs"
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200">
                        {log.summary}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-500">
                        {log.actorName} ({log.actorRole}) ·{" "}
                        {formatDateTime(log.createdAt, settings.timezone)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SpendingModal
        open={spendModal}
        onClose={() => setSpendModal(false)}
        onSaved={() => {
          toast(editingSpend ? "Spending updated!" : "Spending added!");
          loadWorkspace();
        }}
        editing={editingSpend}
        userRole={user.portalRole}
        defaultSection={deptSlug || "bd"}
        sections={sections}
        currency={settings.currency}
      />

      <EarningModal
        open={earnModal}
        onClose={() => setEarnModal(false)}
        onSaved={() => {
          toast(
            editingEarn ? "Customer record updated!" : "Customer earning added!"
          );
          loadWorkspace();
        }}
        editing={editingEarn}
        currency={settings.currency}
      />

      <StaffModal
        open={staffModal}
        onClose={() => setStaffModal(false)}
        onSaved={() => {
          toast(
            editingAccount ? "Account updated!" : "New account created!"
          );
          loadWorkspace();
        }}
        editing={editingAccount}
        actorRole={user.portalRole}
        sections={sections}
        defaultSectionSlug={deptSlug || "bd"}
      />

      {isOwner && (
        <SectionModal
          open={secModal}
          mode={secMode}
          onClose={() => setSecModal(false)}
          onSaved={() => {
            toast(
              secMode === "create"
                ? "New section added!"
                : "Staff divided across sections!"
            );
            loadWorkspace();
          }}
          sections={sections}
          staffList={staffOnlyList}
        />
      )}
    </div>
  );
}
