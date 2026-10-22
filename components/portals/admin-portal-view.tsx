"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Check,
  FolderPlus,
  KeyRound,
  Pencil,
  Plus,
  Save,
  Split,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { EarningModal } from "@/components/modals/earning-modal";
import { SectionModal } from "@/components/modals/section-modal";
import { SpendingModal } from "@/components/modals/spending-modal";
import { StaffModal } from "@/components/modals/staff-modal";
import { TaskModal } from "@/components/modals/task-modal";
import { OwnerStudioPanel } from "@/components/portals/owner-studio-panel";
import {
  EarningTopUpCard,
  SpendingTopUpCard,
} from "@/components/topup-cards";
import { PORTAL_META, STAFF_STATUS_META } from "@/lib/constants";
import type {
  EarningRecord,
  LeaveRequestRecord,
  SectionRecord,
  SpendingRecord,
  StaffStatus,
  TaskRecord,
  UserRecord,
} from "@/lib/types";

type TabId = "inbox" | "spending" | "customers" | "staff" | "studio";

export function AdminPortalView() {
  const { user, settings, t, toast } = useApp();

  const isOwner = user?.portalRole === "erp_owner";
  const deptSlug =
    user?.portalRole === "it_ceo"
      ? "it"
      : user?.portalRole === "bd_ceo"
      ? "bd"
      : null;

  const [tab, setTab] = useState<TabId>("inbox");
  const [spending, setSpending] = useState<SpendingRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [accounts, setAccounts] = useState<UserRecord[]>([]);
  const [allStaff, setAllStaff] = useState<UserRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [spendModal, setSpendModal] = useState(false);
  const [editingSpend, setEditingSpend] = useState<SpendingRecord | null>(null);

  const [earnModal, setEarnModal] = useState(false);
  const [editingEarn, setEditingEarn] = useState<EarningRecord | null>(null);

  const [staffModal, setStaffModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserRecord | null>(null);

  const [secModal, setSecModal] = useState(false);
  const [secMode, setSecMode] = useState<"create" | "divide">("create");

  const [taskModal, setTaskModal] = useState(false);

  const [myNewPassword, setMyNewPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const spendQuery = deptSlug ? `?section=${deptSlug}` : "";
      const taskQuery = deptSlug ? `?section=${deptSlug}` : "";
      const [spRes, eaRes, stRes, lvRes, tkRes] = await Promise.all([
        fetch(`/api/spending${spendQuery}`, { cache: "no-store" }),
        fetch("/api/earnings", { cache: "no-store" }),
        fetch(`/api/staff${isOwner ? "?includeLeaders=true" : ""}`, {
          cache: "no-store",
        }),
        fetch("/api/leaves", { cache: "no-store" }),
        fetch(`/api/tasks${taskQuery}`, { cache: "no-store" }),
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
        setAllStaff(rawStaff.filter((u) => u.portalRole === "staff"));
        setAccounts(
          deptSlug
            ? rawStaff.filter(
                (u) => u.portalRole === "staff" && u.sectionSlug === deptSlug
              )
            : rawStaff
        );
      }
      if (lvRes.ok) {
        const lvJson = await lvRes.json();
        setLeaves(lvJson.leaves ?? []);
      }
      if (tkRes.ok) {
        const tkJson = await tkRes.json();
        setTasks(tkJson.tasks ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [deptSlug, isOwner]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  if (!user) return null;

  const pendingLeavesCount = leaves.filter(
    (l) => l.status === "pending"
  ).length;

  const handleLeaveDecision = async (
    lv: LeaveRequestRecord,
    decision: "approved" | "rejected"
  ) => {
    const res = await fetch(`/api/leaves/${lv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: decision }),
    });
    if (res.ok) {
      toast(decision === "approved" ? t("approved") : t("rejected"));
      loadWorkspace();
    }
  };

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
      toast(STAFF_STATUS_META[nextStatus].label);
      loadWorkspace();
    }
  };

  const handleDeleteSpending = async (rec: SpendingRecord) => {
    if (!window.confirm(`Delete "${rec.title}"?`)) return;
    const res = await fetch(`/api/spending/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Deleted");
      loadWorkspace();
    }
  };

  const handleDeleteEarning = async (rec: EarningRecord) => {
    if (!window.confirm(`Delete "${rec.customerName}"?`)) return;
    const res = await fetch(`/api/earnings/${rec.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Deleted");
      loadWorkspace();
    }
  };

  const handleDeleteAccount = async (target: UserRecord) => {
    if (!window.confirm(`Remove "${target.name}"?`)) return;
    const res = await fetch(`/api/staff/${target.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Removed");
      loadWorkspace();
    }
  };

  const handleCeoPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myNewPassword.trim()) return;
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: myNewPassword.trim() }),
      });
      if (res.ok) {
        setMyNewPassword("");
        toast("Password updated!");
      }
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              tab === "inbox" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("inbox")}
            {pendingLeavesCount > 0 ? ` (${pendingLeavesCount})` : ""}
          </button>

          <button
            type="button"
            onClick={() => setTab("spending")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              tab === "spending" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("spending")} ({spending.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("customers")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              tab === "customers" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("earning")} ({earnings.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("staff")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              tab === "staff" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("staff")} ({accounts.length})
          </button>

          <button
            type="button"
            onClick={() => setTab("studio")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              tab === "studio" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {isOwner ? t("brandStudio") : t("settings")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTaskModal(true)}
            className="royal-btn-outline rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 gold-accent" />
            <span>{t("assignWork")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingSpend(null);
              setSpendModal(true);
            }}
            className="royal-btn-outline rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5 gold-accent" />
            <span>{t("addSpending")}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingEarn(null);
              setEarnModal(true);
            }}
            className="royal-btn rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t("addEarning")}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          ...
        </div>
      ) : tab === "inbox" ? (
        /* INBOX: Leave Approvals + Assigned Todo Work */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="royal-card rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
              {t("leaveRequests")}
            </h2>

            {leaves.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-royal">
                {t("noRecords")}
              </p>
            ) : (
              <div className="space-y-3">
                {leaves.map((lv) => (
                  <div
                    key={lv.id}
                    className="royal-elevated rounded-xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm">{lv.userName}</span>
                        {lv.sectionSlug && (
                          <span className="ms-2 text-[10px] font-bold uppercase gold-accent">
                            {lv.sectionSlug}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold uppercase ${
                          lv.status === "approved"
                            ? "text-emerald-400"
                            : lv.status === "rejected"
                            ? "text-rose-400"
                            : "text-amber-300"
                        }`}
                      >
                        {lv.status}
                      </span>
                    </div>

                    <div className="text-xs text-muted-royal tabular-nums">
                      {lv.leaveType} · {lv.startDate} → {lv.endDate}
                    </div>
                    <p className="text-xs">{lv.reason}</p>

                    {lv.status === "pending" && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleLeaveDecision(lv, "approved")}
                          className="royal-btn rounded-lg px-3 py-1 text-xs inline-flex items-center gap-1"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>{t("approve")}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleLeaveDecision(lv, "rejected")}
                          className="royal-btn-outline rounded-lg px-3 py-1 text-xs text-rose-400 inline-flex items-center gap-1"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>{t("reject")}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="royal-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-base font-bold">{t("todo")}</h2>
              <button
                type="button"
                onClick={() => setTaskModal(true)}
                className="royal-btn rounded-lg px-3 py-1 text-xs inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t("assignWork")}</span>
              </button>
            </div>

            {tasks.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-royal">
                {t("noRecords")}
              </p>
            ) : (
              <div className="space-y-3">
                {tasks.slice(0, 12).map((tk) => (
                  <div
                    key={tk.id}
                    className="royal-elevated rounded-xl p-4 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="gold-accent font-bold">
                        {tk.sectionSlug.toUpperCase()} · {tk.assignedToName}
                      </span>
                      <span
                        className={`font-bold uppercase ${
                          tk.status === "completed"
                            ? "text-emerald-400"
                            : tk.status === "in_progress"
                            ? "text-sky-300"
                            : "text-muted-royal"
                        }`}
                      >
                        {tk.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold">{tk.title}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : tab === "spending" ? (
        <div className="space-y-4">
          {spending.length === 0 ? (
            <div className="royal-card rounded-2xl p-10 text-center text-xs text-muted-royal">
              {t("noRecords")}
            </div>
          ) : (
            spending.map((rec) => (
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
            ))
          )}
        </div>
      ) : tab === "customers" ? (
        <div className="space-y-4">
          {earnings.length === 0 ? (
            <div className="royal-card rounded-2xl p-10 text-center text-xs text-muted-royal">
              {t("noRecords")}
            </div>
          ) : (
            earnings.map((rec) => (
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
            ))
          )}
        </div>
      ) : tab === "staff" ? (
        <div className="space-y-5">
          <div className="flex flex-wrap justify-end gap-2">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSecMode("create");
                    setSecModal(true);
                  }}
                  className="royal-btn-outline rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <FolderPlus className="h-3.5 w-3.5 gold-accent" />
                  <span>{t("addSection")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecMode("divide");
                    setSecModal(true);
                  }}
                  className="royal-btn-outline rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1.5"
                >
                  <Split className="h-3.5 w-3.5 gold-accent" />
                  <span>{t("divideStaff")}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingAccount(null);
                setStaffModal(true);
              }}
              className="royal-btn rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t("addStaff")}</span>
            </button>
          </div>

          {accounts.length === 0 ? (
            <div className="royal-card rounded-2xl p-10 text-center text-xs text-muted-royal">
              {t("noRecords")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="royal-card rounded-2xl p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base">{acc.name}</span>
                        <span className="text-[11px] font-bold uppercase gold-accent">
                          {PORTAL_META[acc.portalRole].shortTitle}
                        </span>
                      </div>
                      <p className="text-xs text-muted-royal">
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
                        className="royal-btn-outline rounded-lg p-1.5"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {acc.id !== user.id && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAccount(acc)}
                          className="royal-btn-outline rounded-lg p-1.5 text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {acc.portalRole === "staff" && (
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
                          className={`rounded-lg py-1.5 px-2 text-xs font-semibold ${
                            acc.staffStatus === st
                              ? "royal-btn"
                              : "royal-btn-outline"
                          }`}
                        >
                          {STAFF_STATUS_META[st].label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : isOwner ? (
        <OwnerStudioPanel />
      ) : (
        <form
          onSubmit={handleCeoPasswordChange}
          className="royal-card max-w-md rounded-2xl p-6 space-y-4"
        >
          <h3 className="text-base font-bold flex items-center gap-2">
            <KeyRound className="h-4 w-4 gold-accent" />
            <span>{t("password")}</span>
          </h3>
          <input
            type="password"
            minLength={6}
            placeholder="New password"
            value={myNewPassword}
            onChange={(e) => setMyNewPassword(e.target.value)}
            className="royal-input w-full"
          />
          <button
            type="submit"
            disabled={savingPw}
            className="royal-btn rounded-xl px-5 py-2 text-sm inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{t("save")}</span>
          </button>
        </form>
      )}

      {/* Modals */}
      <SpendingModal
        open={spendModal}
        onClose={() => setSpendModal(false)}
        onSaved={() => {
          toast("Saved");
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
          toast("Saved");
          loadWorkspace();
        }}
        editing={editingEarn}
        currency={settings.currency}
      />

      <StaffModal
        open={staffModal}
        onClose={() => setStaffModal(false)}
        onSaved={() => {
          toast("Saved");
          loadWorkspace();
        }}
        editing={editingAccount}
        actorRole={user.portalRole}
        sections={sections}
        defaultSectionSlug={deptSlug || "bd"}
      />

      <TaskModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        onSaved={() => {
          toast("Work assigned!");
          loadWorkspace();
        }}
        actorRole={user.portalRole}
        defaultSection={deptSlug === "it" ? "it" : "bd"}
        staffList={allStaff}
      />

      {isOwner && (
        <SectionModal
          open={secModal}
          mode={secMode}
          onClose={() => setSecModal(false)}
          onSaved={() => {
            toast("Saved");
            loadWorkspace();
          }}
          sections={sections}
          staffList={allStaff}
        />
      )}
    </div>
  );
}
