"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Crown,
  History,
  Send,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { UserAvatar } from "@/components/user-avatar";
import { ATTENDANCE_STATUS_META, LEAVE_TYPES } from "@/lib/constants";
import { formatTimeShort, todayInTimezone } from "@/lib/format";
import type {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequestRecord,
  UserRecord,
} from "@/lib/types";

interface MemberHistoryEntry {
  workDate: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  markedByName?: string | null;
}

export default function AttendancePage() {
  const { user, settings, lang, t, toast } = useApp();
  const [view, setView] = useState<"present" | "leave">("present");
  const [date, setDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingUserId, setMarkingUserId] = useState<string | null>(null);

  // History modal state when clicking a member's attendance
  const [historyProfile, setHistoryProfile] = useState<UserRecord | null>(null);
  const [historyEntries, setHistoryEntries] = useState<MemberHistoryEntry[]>(
    []
  );
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Leave request form state
  const [leaveUserId, setLeaveUserId] = useState("");
  const [leaveType, setLeaveType] = useState<string>(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [endDate, setEndDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [reason, setReason] = useState("");
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?date=${encodeURIComponent(date)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        const list: AttendanceRecord[] = json.records ?? [];
        setRecords(list);
        setLeaves(json.leaves ?? []);
        if (user && list.some((r) => r.userId === user.id)) {
          setLeaveUserId(user.id);
        } else if (!leaveUserId && list[0]) {
          setLeaveUserId(list[0].userId);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [date, user, leaveUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Automatic 4:00 AM daily rollover watcher while page stays open
  useEffect(() => {
    const interval = setInterval(() => {
      const liveWorkDate = todayInTimezone(settings.timezone);
      setDate((prev) => (prev !== liveWorkDate ? liveWorkDate : prev));
    }, 15_000);
    return () => clearInterval(interval);
  }, [settings.timezone]);

  // One-click "Present" handler — instant optimistic glow + permanent DB save!
  const handleMarkPresent = async (row: AttendanceRecord) => {
    setMarkingUserId(row.userId);
    // Instant optimistic UI glow update
    setRecords((prev) =>
      prev.map((item) =>
        item.userId === row.userId
          ? {
              ...item,
              status: "present",
              checkIn: item.checkIn || new Date().toISOString(),
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "present",
          userId: row.userId,
          workDate: date,
        }),
      });
      if (res.ok) {
        toast(`${row.userName} — ${t("present")}!`);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Unable to mark attendance", "error");
        loadData();
      }
    } finally {
      setMarkingUserId(null);
    }
  };

  // Open Member's Full Attendance Stats & History Modal
  const openAttendanceHistory = async (row: AttendanceRecord) => {
    setHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/staff/${row.userId}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setHistoryProfile(json.profile ?? null);
        setHistoryEntries(json.attendanceHistory ?? []);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      const res = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: leaveUserId || user?.id,
          leaveType,
          startDate,
          endDate,
          reason,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setReason("");
        toast("Leave request sent for approval!");
        loadData();
      } else {
        toast(data.error || "Unable to submit leave", "error");
      }
    } finally {
      setSubmittingLeave(false);
    }
  };

  const canReviewLeave = (lv: LeaveRequestRecord) => {
    if (!user) return false;
    if (user.portalRole === "erp_owner") return true;
    if (user.portalRole === "it_ceo") return lv.sectionSlug === "it";
    if (user.portalRole === "bd_ceo") return lv.sectionSlug === "bd";
    return false;
  };

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
      loadData();
    }
  };

  // Split cleanly into the 2 sections: IT Team (IT CEO + IT staff) & BD Team (BD CEO + BD staff)
  const itTeam = records.filter((r) => r.sectionSlug === "it");
  const bdTeam = records.filter((r) => r.sectionSlug === "bd");
  const otherTeam = records.filter(
    (r) => r.sectionSlug !== "it" && r.sectionSlug !== "bd"
  );

  const renderMemberRow = (row: AttendanceRecord) => {
    const isMarked = row.status === "present" || row.status === "late";
    const isCeo = row.portalRole === "it_ceo" || row.portalRole === "bd_ceo";

    return (
      <div
        key={row.userId}
        style={
          isMarked
            ? {
                borderColor: "rgba(52, 211, 153, 0.45)",
              }
            : undefined
        }
        className="royal-elevated rounded-2xl p-4 flex items-center justify-between gap-3 transition-all"
      >
        {/* Clickable Profile Logo + Name -> Opens Full Profile Page (/staff/[id]) */}
        <Link
          href={`/staff/${row.userId}`}
          className="flex items-center gap-3.5 min-w-0 group"
        >
          <UserAvatar
            name={row.userName}
            avatarUrl={row.avatarUrl}
            size="md"
            glowing={isMarked}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-sm sm:text-base font-extrabold truncate group-hover:underline ${
                  isMarked ? "attendance-glow-name" : ""
                }`}
              >
                {row.userName}
              </span>
              {isCeo && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-secondary)] px-2 py-0.5 text-[10px] font-extrabold uppercase gold-accent">
                  <Crown className="h-2.5 w-2.5" />
                  {row.portalRole === "it_ceo" ? "IT CEO" : "BD CEO"}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-royal flex items-center gap-2">
              <span className="truncate">{row.jobTitle}</span>
              <span>·</span>
              <span className="tabular-nums text-emerald-400 font-semibold">
                {row.attendanceRate ?? 0}%
              </span>
            </div>
          </div>
        </Link>

        {/* Right Controls: Mark Present OR Click Marked Badge to Inspect Full History */}
        <div className="flex items-center gap-2 shrink-0">
          {isMarked ? (
            <button
              type="button"
              onClick={() => openAttendanceHistory(row)}
              title="Click to view attendance stats & history"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/15 px-3.5 py-2 text-xs font-extrabold text-emerald-300 shadow-xs hover:bg-emerald-500/25 transition-all"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>
                {t("present")}
                {row.checkIn
                  ? ` · ${formatTimeShort(row.checkIn, settings.timezone)}`
                  : ""}
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={markingUserId === row.userId}
                onClick={() => handleMarkPresent(row)}
                className="royal-btn rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
              >
                {markingUserId === row.userId ? "..." : t("present")}
              </button>
              <button
                type="button"
                onClick={() => openAttendanceHistory(row)}
                title="Attendance History"
                className="royal-btn-outline rounded-xl p-2"
              >
                <History className="h-4 w-4 text-muted-royal" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-7">
      {/* Header + 4:00 AM Cycle Info + View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("attendance")}
            </h1>
            <span className="rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-semibold gold-accent tabular-nums">
              New Day Starts Daily at 4:00 AM · {date}
            </span>
          </div>
          <div className="gold-line w-28" />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="royal-input py-1.5 text-xs"
          />

          <button
            type="button"
            onClick={() => setView("present")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              view === "present" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("markAttendance")}
          </button>

          <button
            type="button"
            onClick={() => setView("leave")}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold ${
              view === "leave" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("leaveRequests")}
          </button>
        </div>
      </div>

      {view === "present" ? (
        loading ? (
          <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
            ...
          </div>
        ) : (
          <div className="space-y-6">
            {/* THE 2 TEAM SECTIONS: IT TEAM & BD TEAM */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Section 1: IT Team */}
              <section className="royal-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-lg border border-[var(--accent-secondary)] px-3 py-1 text-xs font-extrabold uppercase tracking-widest gold-accent">
                      IT Team
                    </span>
                    <span className="text-xs text-muted-royal">
                      (
                      {
                        itTeam.filter(
                          (m) => m.status === "present" || m.status === "late"
                        ).length
                      }
                      /{itTeam.length} {t("present")})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {itTeam.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-royal">
                      {t("noRecords")}
                    </p>
                  ) : (
                    itTeam.map(renderMemberRow)
                  )}
                </div>
              </section>

              {/* Section 2: BD Team */}
              <section className="royal-card rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-lg border border-[var(--accent-secondary)] px-3 py-1 text-xs font-extrabold uppercase tracking-widest gold-accent">
                      BD Team
                    </span>
                    <span className="text-xs text-muted-royal">
                      (
                      {
                        bdTeam.filter(
                          (m) => m.status === "present" || m.status === "late"
                        ).length
                      }
                      /{bdTeam.length} {t("present")})
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {bdTeam.length === 0 ? (
                    <p className="py-6 text-center text-xs text-muted-royal">
                      {t("noRecords")}
                    </p>
                  ) : (
                    bdTeam.map(renderMemberRow)
                  )}
                </div>
              </section>
            </div>

            {otherTeam.length > 0 && (
              <section className="royal-card rounded-3xl p-6 space-y-4">
                <div className="border-b border-[var(--border-subtle)] pb-3">
                  <span className="text-xs font-extrabold uppercase tracking-widest gold-accent">
                    Additional Sections
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {otherTeam.map(renderMemberRow)}
                </div>
              </section>
            )}
          </div>
        )
      ) : (
        /* Leave Submission + Approval Queue */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleSubmitLeave}
            className="lg:col-span-5 royal-card rounded-2xl p-6 space-y-4"
          >
            <h2 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
              {t("submitLeave")}
            </h2>

            {user?.portalRole !== "staff" && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                  Member *
                </label>
                <select
                  required
                  value={leaveUserId}
                  onChange={(e) => setLeaveUserId(e.target.value)}
                  className="royal-input w-full"
                >
                  {records.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.userName} ({(r.sectionSlug || "").toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                {t("leaveType")}
              </label>
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                  {t("startDate")}
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="royal-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                  {t("endDate")}
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="royal-input w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                {t("reason")} *
              </label>
              <textarea
                rows={3}
                required
                placeholder="..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="royal-input w-full"
              />
            </div>

            <button
              type="submit"
              disabled={submittingLeave}
              className="royal-btn w-full rounded-xl py-2.5 text-sm inline-flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>{submittingLeave ? "..." : t("submitLeave")}</span>
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {leaves.length === 0 ? (
              <div className="royal-card rounded-2xl p-10 text-center text-xs text-muted-royal">
                {t("noRecords")}
              </div>
            ) : (
              leaves.map((lv) => (
                <div
                  key={lv.id}
                  className="royal-card rounded-2xl p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <Link
                        href={`/staff/${lv.userId}`}
                        className="font-bold text-base hover:underline"
                      >
                        {lv.userName}
                      </Link>
                      {lv.sectionSlug && (
                        <span className="rounded border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase gold-accent">
                          {lv.sectionSlug}
                        </span>
                      )}
                      <span className="text-xs text-muted-royal">
                        {lv.leaveType}
                      </span>
                    </div>

                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                        lv.status === "approved"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : lv.status === "rejected"
                          ? "bg-rose-500/15 text-rose-400"
                          : "bg-amber-500/15 text-amber-300"
                      }`}
                    >
                      {lv.status}
                    </span>
                  </div>

                  <div className="text-xs text-muted-royal tabular-nums">
                    {lv.startDate} → {lv.endDate}
                  </div>

                  <p className="royal-elevated rounded-xl px-3.5 py-2.5 text-sm">
                    {lv.reason}
                  </p>

                  {lv.status === "pending" && canReviewLeave(lv) && (
                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleLeaveDecision(lv, "approved")}
                        className="royal-btn rounded-xl px-4 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{t("approve")}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLeaveDecision(lv, "rejected")}
                        className="royal-btn-outline rounded-xl px-4 py-1.5 text-xs text-rose-400 inline-flex items-center gap-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>{t("reject")}</span>
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Attendance Stats & Full History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
          <div className="royal-card w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
              <div className="flex items-center gap-3">
                {historyProfile && (
                  <UserAvatar
                    name={historyProfile.name}
                    avatarUrl={historyProfile.avatarUrl}
                    size="md"
                  />
                )}
                <div>
                  <h3 className="text-base font-bold">
                    {historyProfile?.name || "Attendance History"}
                  </h3>
                  {historyProfile && (
                    <Link
                      href={`/staff/${historyProfile.id}`}
                      className="text-xs gold-accent hover:underline"
                    >
                      Open Full Profile →
                    </Link>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="rounded-lg p-1.5 hover:opacity-80"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {loadingHistory ? (
                <div className="py-10 text-center text-xs text-muted-royal">
                  ...
                </div>
              ) : (
                <>
                  {historyProfile && (
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="royal-elevated rounded-2xl p-4">
                        <div className="text-2xl font-extrabold tabular-nums text-emerald-400">
                          {historyProfile.attendanceRate ?? 0}%
                        </div>
                        <div className="text-xs text-muted-royal mt-0.5">
                          {t("attendanceRate")}
                        </div>
                      </div>
                      <div className="royal-elevated rounded-2xl p-4">
                        <div className="text-2xl font-extrabold tabular-nums gold-accent">
                          {historyProfile.presentDaysCount ?? 0}
                        </div>
                        <div className="text-xs text-muted-royal mt-0.5">
                          Days Marked {t("present")}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {historyEntries.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-royal">
                        {t("noRecords")}
                      </p>
                    ) : (
                      historyEntries.map((item) => {
                        const meta =
                          ATTENDANCE_STATUS_META[item.status] ??
                          ATTENDANCE_STATUS_META.present;
                        return (
                          <div
                            key={item.workDate}
                            className="royal-elevated rounded-xl px-4 py-3 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold tabular-nums">
                                {item.workDate}
                              </span>
                              {item.checkIn && (
                                <span className="ms-2 text-muted-royal tabular-nums">
                                  ·{" "}
                                  {formatTimeShort(
                                    item.checkIn,
                                    settings.timezone
                                  )}
                                </span>
                              )}
                            </div>
                            <span
                              style={{ color: meta.color }}
                              className="font-extrabold uppercase"
                            >
                              {lang === "ur" ? meta.urduLabel : meta.label}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
