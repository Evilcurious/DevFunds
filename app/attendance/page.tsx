"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Crown,
  History,
  Lock,
  Send,
  ShieldCheck,
  Undo2,
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
  // The signed-in viewer's own row (the ERP Owner is not listed on the board)
  const [meRecord, setMeRecord] = useState<AttendanceRecord | null>(null);
  // Active work day reported by the server (4:00 AM cycle) — self-marking only!
  const [serverToday, setServerToday] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
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
        setMeRecord(json.me ?? null);
        if (typeof json.today === "string") setServerToday(json.today);
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

  // ── ATTENDANCE IS SELF-MARKED ONLY: nobody can mark anyone else ──────────
  const myRecord =
    records.find((r) => r.userId === user?.id) || meRecord || null;
  const isTodayView = date === serverToday;

  const markMyAttendance = async (status: AttendanceStatus) => {
    if (!user) return;
    setMarkingUserId(user.id);
    setRecords((prev) =>
      prev.map((item) =>
        item.userId === user.id
          ? {
              ...item,
              status,
              checkIn:
                item.checkIn ||
                (status === "present" || status === "late" || status === "half_day"
                  ? new Date().toISOString()
                  : item.checkIn),
            }
          : item
      )
    );

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark",
          userId: user.id,
          status,
          workDate: date,
        }),
      });
      if (res.ok) {
        toast(`${user.name} — ${status === "present" ? t("present") : status}!`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Unable to mark attendance", "error");
      }
      loadData();
    } finally {
      setMarkingUserId(null);
    }
  };

  const clearMyMark = async () => {
    if (!user) return;
    setMarkingUserId(user.id);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "undo", userId: user.id, workDate: date }),
    });
    setMarkingUserId(null);
    if (res.ok) {
      toast(t("clearMyMark"));
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Unable to clear", "error");
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

  // A CEO may only file leave for their own department; staff only themselves.
  const leaveTargets = useMemo(() => {
    if (!user) return records;
    if (user.portalRole === "erp_owner") return records;
    const dept =
      user.portalRole === "it_ceo"
        ? "it"
        : user.portalRole === "bd_ceo"
        ? "bd"
        : user.sectionSlug;
    return records.filter(
      (r) => r.userId === user.id || (dept && r.sectionSlug === dept)
    );
  }, [records, user]);

  // Split cleanly into the 2 sections: IT Team (IT CEO + IT staff) & BD Team (BD CEO + BD staff)
  const itTeam = records.filter((r) => r.sectionSlug === "it");
  const bdTeam = records.filter((r) => r.sectionSlug === "bd");
  const otherTeam = records.filter(
    (r) => r.sectionSlug !== "it" && r.sectionSlug !== "bd"
  );

  const renderMemberRow = (row: AttendanceRecord) => {
    const hasMark = row.status !== "unmarked";
    const isMarked = row.status === "present" || row.status === "late";
    const isCeo = row.portalRole === "it_ceo" || row.portalRole === "bd_ceo";
    const isSelf = row.userId === user?.id;
    const marking = markingUserId === row.userId;
    const meta = ATTENDANCE_STATUS_META[row.status];

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
              {isSelf && (
                <span className="rounded border border-[var(--accent-secondary)] px-1.5 text-[9px] font-black uppercase gold-accent">
                  {t("you")}
                </span>
              )}
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

        {/* Right controls: only the account holder can mark their own day */}
        <div className="flex items-center gap-2 shrink-0">
          {hasMark ? (
            <>
              <button
                type="button"
                onClick={() => openAttendanceHistory(row)}
                title="Click to view attendance stats & history"
                style={
                  isMarked
                    ? undefined
                    : {
                        borderColor: `${meta.color}66`,
                        color: meta.color,
                        background: `${meta.color}1a`,
                      }
                }
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition-all ${
                  isMarked
                    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                    : ""
                }`}
              >
                <CheckCircle2
                  className={`h-4 w-4 ${isMarked ? "text-emerald-400" : ""}`}
                />
                <span>
                  {lang === "ur" ? meta.urduLabel : meta.label}
                  {row.checkIn
                    ? ` · ${formatTimeShort(row.checkIn, settings.timezone)}`
                    : ""}
                </span>
              </button>
              {isSelf && isTodayView && (
                <button
                  type="button"
                  disabled={marking}
                  onClick={clearMyMark}
                  title="Clear my mark for today"
                  className="royal-btn-outline rounded-xl p-2 text-rose-400"
                >
                  <Undo2 className="h-4 w-4" />
                </button>
              )}
            </>
          ) : isSelf && isTodayView ? (
            <>
              <button
                type="button"
                disabled={marking}
                onClick={() => markMyAttendance("present")}
                className="royal-btn rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
              >
                {marking ? "..." : t("present")}
              </button>
              <button
                type="button"
                disabled={marking}
                onClick={() => markMyAttendance("late")}
                className="royal-btn-outline rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60"
              >
                {lang === "ur" ? ATTENDANCE_STATUS_META.late.urduLabel : "Late"}
              </button>
            </>
          ) : (
            <span
              title={t("selfMarkHint")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-[11px] font-bold text-muted-royal"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{t("selfMarkOnly")}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => openAttendanceHistory(row)}
            title="Attendance History"
            className="royal-btn-outline rounded-xl p-2"
          >
            <History className="h-4 w-4 text-muted-royal" />
          </button>
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
          <p className="text-xs text-muted-royal inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            {t("selfMarkHint")}
          </p>
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
            {/* My attendance quick action */}
            {user && (
              <div className="royal-card rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <UserAvatar
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    size="sm"
                    glowing={myRecord?.status === "present" || myRecord?.status === "late"}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold">
                      {t("myAttendance")} · {date}
                    </div>
                    <div className="text-xs text-muted-royal">
                      {myRecord
                        ? ATTENDANCE_STATUS_META[myRecord.status].label
                        : ATTENDANCE_STATUS_META.unmarked.label}
                      {myRecord?.checkIn
                        ? ` · ${formatTimeShort(myRecord.checkIn, settings.timezone)}`
                        : ""}
                    </div>
                  </div>
                </div>

                {isTodayView ? (
                  myRecord?.status === "present" || myRecord?.status === "late" ? (
                    <button
                      type="button"
                      onClick={clearMyMark}
                      className="royal-btn-outline rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1.5"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                      <span>{t("clearMyMark")}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={markingUserId === user.id}
                        onClick={() => markMyAttendance("present")}
                        className="royal-btn rounded-xl px-5 py-2 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t("myAttendance")}</span>
                      </button>
                      <button
                        type="button"
                        disabled={markingUserId === user.id}
                        onClick={() => markMyAttendance("late")}
                        className="royal-btn-outline rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
                      >
                        {lang === "ur"
                          ? ATTENDANCE_STATUS_META.late.urduLabel
                          : ATTENDANCE_STATUS_META.late.label}
                      </button>
                    </div>
                  )
                ) : (
                  <span className="text-[11px] font-bold uppercase text-muted-royal">
                    Closed · {t("markAttendance")} only for {serverToday}
                  </span>
                )}
              </div>
            )}

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
                  {leaveTargets.map((r) => (
                    <option key={r.userId} value={r.userId}>
                      {r.userName} ({(r.sectionSlug || "").toUpperCase()})
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-muted-royal">
                  Leave can only be filed for your own account or your own
                  department members.
                </p>
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
