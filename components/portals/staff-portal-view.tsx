"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Play,
  Send,
  Settings,
} from "lucide-react";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { useApp } from "@/components/app-context";
import { LEAVE_TYPES, STAFF_STATUS_META } from "@/lib/constants";
import { todayInTimezone } from "@/lib/format";
import type {
  LeaveRequestRecord,
  StaffStatus,
  TaskRecord,
} from "@/lib/types";

export function StaffPortalView() {
  const {
    user,
    setUser,
    refreshSession,
    settings,
    lang,
    t,
    toast,
    requestBrowserNotifications,
    browserNotifPermission,
  } = useApp();

  const [tab, setTab] = useState<"inbox" | "account">("inbox");
  const [inboxTasks, setInboxTasks] = useState<TaskRecord[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRequestRecord[]>([]);
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [endDate, setEndDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [leaveReason, setLeaveReason] = useState("");
  const [todayPresent, setTodayPresent] = useState(false);
  const [myCheckIn, setMyCheckIn] = useState<string | null>(null);
  const [myAttendanceRate, setMyAttendanceRate] = useState(0);

  // Submit work inline inputs
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [afterSubmitStatus, setAfterSubmitStatus] =
    useState<StaffStatus>("free");

  const loadInboxAndLeaves = useCallback(async () => {
    const [taskRes, leaveRes, attRes] = await Promise.all([
      fetch("/api/tasks?mine=true", { cache: "no-store" }),
      fetch("/api/leaves", { cache: "no-store" }),
      fetch("/api/attendance", { cache: "no-store" }),
    ]);
    if (taskRes.ok) {
      const json = await taskRes.json();
      setInboxTasks(json.tasks ?? []);
    }
    if (leaveRes.ok) {
      const json = await leaveRes.json();
      setMyLeaves(json.leaves ?? []);
    }
    if (attRes.ok && user) {
      const json = await attRes.json();
      const me =
        (json.records ?? []).find(
          (r: { userId: string; status: string }) => r.userId === user.id
        ) ?? json.me;
      setTodayPresent(me?.status === "present" || me?.status === "late");
      setMyCheckIn(me?.checkIn ?? null);
      setMyAttendanceRate(me?.attendanceRate ?? 0);
    }
  }, [user]);

  useEffect(() => {
    loadInboxAndLeaves();
    const timer = setInterval(loadInboxAndLeaves, 9000);
    return () => clearInterval(timer);
  }, [loadInboxAndLeaves]);

  if (!user) return null;

  const handleStatusSwitch = async (nextStatus: StaffStatus) => {
    const res = await fetch("/api/auth/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffStatus: nextStatus }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.user) {
      setUser(data.user);
      toast(STAFF_STATUS_META[nextStatus].label);
    }
  };

  const handleMarkPresent = async () => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "present", userId: user.id }),
    });
    if (res.ok) {
      setTodayPresent(true);
      toast(t("present"));
    }
  };

  // Selecting a task automatically flips status -> 'working'!
  const handleSelectTask = async (task: TaskRecord) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "working" }),
    });
    if (res.ok) {
      await refreshSession();
      toast("Task selected — status set to Working!");
      loadInboxAndLeaves();
    }
  };

  // Submitting work sends notification to CEO + sets chosen status (Free / Offline / Working)!
  const handleSubmitWork = async (task: TaskRecord) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "submitted",
        submissionLink,
        completionNote,
        nextStaffStatus: afterSubmitStatus,
      }),
    });
    if (res.ok) {
      setSubmittingTaskId(null);
      setSubmissionLink("");
      setCompletionNote("");
      await refreshSession();
      toast("Submitted to CEO!");
      loadInboxAndLeaves();
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/leaves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user.id,
        leaveType,
        startDate,
        endDate,
        reason: leaveReason,
      }),
    });
    if (res.ok) {
      setLeaveReason("");
      toast("Leave request submitted");
      loadInboxAndLeaves();
    }
  };

  return (
    <div className="space-y-6">
      {/* Staff Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("inbox")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 ${
              tab === "inbox" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            <Inbox className="h-4 w-4" />
            <span>
              {t("inbox")} ({inboxTasks.length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("account")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 ${
              tab === "account" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>{t("accountSettings")}</span>
          </button>
        </div>

        <Link
          href={`/staff/${user.id}`}
          className="royal-btn-outline rounded-xl px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
        >
          <span>{t("viewProfile")}</span>
          <ArrowUpRight className="h-3.5 w-3.5 gold-accent" />
        </Link>
      </div>

      {tab === "account" ? (
        <AccountSettingsPanel />
      ) : (
        <div className="space-y-6">
          {/* Quick Status Switcher: Working / Free / Offline / Active */}
          <div className="royal-card rounded-2xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                ["working", "free", "offline", "active"] as StaffStatus[]
              ).map((code) => {
                const meta = STAFF_STATUS_META[code];
                const selected = user.staffStatus === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleStatusSwitch(code)}
                    style={
                      selected
                        ? { borderColor: "var(--accent-secondary)" }
                        : undefined
                    }
                    className="royal-elevated rounded-xl p-4 flex items-center justify-between text-sm font-bold"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: meta.dotColor }}
                      />
                      <span>{lang === "ur" ? meta.urduLabel : meta.label}</span>
                    </span>
                    {selected && (
                      <CheckCircle2 className="h-4 w-4 gold-accent shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Portal Inbox: Assigned Work + Submit to CEO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 royal-card rounded-2xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                <div className="flex items-center gap-2">
                  <Inbox className="h-5 w-5 gold-accent" />
                  <h2 className="text-base font-bold">
                    {t("inbox")} ({inboxTasks.length})
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  {browserNotifPermission !== "granted" &&
                    browserNotifPermission !== "unsupported" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await requestBrowserNotifications();
                          if (ok) toast("Web alerts active!");
                        }}
                        className="royal-btn-outline rounded-xl px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        <BellRing className="h-3.5 w-3.5 gold-accent" />
                        <span>{t("enableAlerts")}</span>
                      </button>
                    )}

                  {todayPresent ? (
                    <span className="attendance-glow-name inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t("present")}
                      {myCheckIn
                        ? ` · ${new Date(myCheckIn).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                      <span className="text-[10px] text-muted-royal normal-case">
                        {myAttendanceRate}%
                      </span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleMarkPresent}
                      className="royal-btn rounded-xl px-4 py-1.5 text-xs font-bold"
                    >
                      {t("present")}
                    </button>
                  )}
                </div>
              </div>

              {inboxTasks.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-royal">
                  {t("noRecords")}
                </p>
              ) : (
                <div className="space-y-3.5">
                  {inboxTasks.map((task) => (
                    (() => {
                      const myStatus = task.viewerStatus ?? task.status;
                      return (
                    <div
                      key={task.id}
                      className="royal-elevated rounded-xl p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase gold-accent">
                              {task.priority}
                            </span>
                            {task.dueDate && (
                              <span className="text-xs text-muted-royal tabular-nums">
                                · {task.dueDate}
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm sm:text-base font-bold mt-0.5">
                            {task.title}
                          </h3>
                        </div>

                        <span className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-0.5 text-xs font-bold uppercase">
                          {myStatus}
                          {task.assignees.length > 1
                            ? ` · ${task.completedCount}/${task.assignees.length}`
                            : ""}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-xs sm:text-sm text-muted-royal whitespace-pre-line">
                          {task.description}
                        </p>
                      )}

                      {task.assignees.length > 1 && (
                        <p className="text-[11px] text-muted-royal">
                          {t("sharedWith")} {task.assignees.length}:{" "}
                          {task.assignees.map((a) => a.name).join(", ")}
                        </p>
                      )}

                      {task.referenceLink && (
                        <a
                          href={task.referenceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs gold-accent hover:underline"
                        >
                          <span>Reference</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {/* Select Task OR Submit Work to CEO */}
                      <div className="pt-2 border-t border-[var(--border-subtle)]">
                        {myStatus === "pending" && (
                          <button
                            type="button"
                            onClick={() => handleSelectTask(task)}
                            className="royal-btn rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1.5"
                          >
                            <Play className="h-3.5 w-3.5" />
                            <span>{t("selectTask")}</span>
                          </button>
                        )}

                        {myStatus === "working" &&
                          (submittingTaskId === task.id ? (
                            <div className="space-y-2.5">
                              <input
                                type="text"
                                placeholder="Submitted work URL (optional)"
                                value={submissionLink}
                                onChange={(e) =>
                                  setSubmissionLink(e.target.value)
                                }
                                className="royal-input w-full text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Message / delivery note to CEO..."
                                value={completionNote}
                                onChange={(e) =>
                                  setCompletionNote(e.target.value)
                                }
                                className="royal-input w-full text-xs"
                              />
                              <select
                                value={afterSubmitStatus}
                                onChange={(e) =>
                                  setAfterSubmitStatus(
                                    e.target.value as StaffStatus
                                  )
                                }
                                className="royal-input w-full text-xs"
                              >
                                <option value="free">
                                  After Submit Status: Free
                                </option>
                                <option value="offline">
                                  After Submit Status: Offline
                                </option>
                                <option value="working">
                                  After Submit Status: Keep Working
                                </option>
                              </select>
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSubmittingTaskId(null)}
                                  className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs"
                                >
                                  {t("cancel")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSubmitWork(task)}
                                  className="royal-btn rounded-lg px-4 py-1.5 text-xs inline-flex items-center gap-1"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                  <span>{t("submitWork")}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSubmittingTaskId(task.id)}
                              className="royal-btn rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1.5"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{t("submitWork")}</span>
                            </button>
                          ))}

                        {(myStatus === "submitted" || myStatus === "completed") && (
                          <div className="text-xs text-emerald-400 font-semibold">
                            ✓ {myStatus.toUpperCase()}
                            {task.submissionLink
                              ? ` · ${task.submissionLink}`
                              : ""}
                          </div>
                        )}
                      </div>
                    </div>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>

            {/* Leave Request Panel */}
            <div className="lg:col-span-5 space-y-4">
              <form
                onSubmit={handleSubmitLeave}
                className="royal-card rounded-2xl p-6 space-y-4"
              >
                <h2 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
                  {t("submitLeave")}
                </h2>

                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="royal-input w-full"
                >
                  {LEAVE_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="royal-input w-full"
                  />
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="royal-input w-full"
                  />
                </div>

                <textarea
                  rows={2}
                  required
                  placeholder={t("reason")}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="royal-input w-full"
                />

                <button
                  type="submit"
                  className="royal-btn w-full rounded-xl py-2.5 text-sm inline-flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{t("submitLeave")}</span>
                </button>
              </form>

              {myLeaves.length > 0 && (
                <div className="royal-card rounded-2xl p-5 space-y-2.5">
                  {myLeaves.slice(0, 4).map((lv) => (
                    <div
                      key={lv.id}
                      className="royal-elevated rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs"
                    >
                      <span className="tabular-nums">
                        {lv.startDate} → {lv.endDate}
                      </span>
                      <span
                        className={`font-bold uppercase ${
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
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
