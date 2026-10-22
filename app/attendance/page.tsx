"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Check, CheckCircle2, Send, X } from "lucide-react";
import { useApp } from "@/components/app-context";
import { ATTENDANCE_STATUS_META, LEAVE_TYPES } from "@/lib/constants";
import { formatTimeShort, todayInTimezone } from "@/lib/format";
import type {
  AttendanceRecord,
  LeaveRequestRecord,
  SectionRecord,
} from "@/lib/types";

export default function AttendancePage() {
  const { user, settings, lang, t, toast } = useApp();
  const [view, setView] = useState<"present" | "leave">("present");
  const [date, setDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [section, setSection] = useState<string>("all");
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
        `/api/attendance?date=${encodeURIComponent(date)}&section=${encodeURIComponent(section)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        setSections(json.sections ?? []);
        const list: AttendanceRecord[] = json.records ?? [];
        setRecords(list);
        setLeaves(json.leaves ?? []);
        if (user?.portalRole === "staff") {
          setLeaveUserId(user.id);
        } else if (!leaveUserId && list[0]) {
          setLeaveUserId(list[0].userId);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [date, section, user, leaveUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // One-click "Present" handler!
  const handleClickPresent = async (row: AttendanceRecord) => {
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
      toast(`${row.userName} — ${t("present")}`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Failed", "error");
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
          userId: user?.portalRole === "staff" ? user.id : leaveUserId,
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
      toast(
        decision === "approved"
          ? `${lv.userName} leave approved`
          : `${lv.userName} leave rejected`
      );
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Action failed", "error");
    }
  };

  return (
    <div className="space-y-7">
      {/* Header + 2-Section Switcher: Mark Present vs Leave Requests */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("attendance")}
          </h1>
          <div className="gold-line w-24" />
        </div>

        <div className="flex items-center gap-2">
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
        <div className="space-y-5">
          {/* Date & Section Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSection("all")}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase ${
                  section === "all" ? "royal-btn" : "royal-btn-outline"
                }`}
              >
                {t("allSections")}
              </button>
              {sections.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setSection(sec.slug)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase ${
                    section === sec.slug ? "royal-btn" : "royal-btn-outline"
                  }`}
                >
                  {sec.name}
                </button>
              ))}
            </div>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="royal-input py-1.5 text-xs"
            />
          </div>

          {/* One-Click "Present" Attendance Board */}
          {loading ? (
            <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
              ...
            </div>
          ) : records.length === 0 ? (
            <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
              {t("noRecords")}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {records.map((row) => {
                const isPresent = row.status === "present";
                const attMeta = ATTENDANCE_STATUS_META[row.status];

                return (
                  <div
                    key={row.userId}
                    className="royal-card rounded-2xl p-5 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold truncate">
                          {row.userName}
                        </span>
                        {row.sectionSlug && (
                          <span className="rounded border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] font-bold uppercase gold-accent">
                            {row.sectionName || row.sectionSlug}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-royal truncate">
                        {row.jobTitle}
                      </div>
                      <div className="text-[11px] text-muted-royal tabular-nums">
                        <span style={{ color: attMeta.color }}>
                          {lang === "ur" ? attMeta.urduLabel : attMeta.label}
                        </span>
                        {row.checkIn &&
                          ` · ${formatTimeShort(row.checkIn, settings.timezone)}`}
                      </div>
                    </div>

                    {isPresent ? (
                      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-2 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t("present")}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleClickPresent(row)}
                        className="royal-btn shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold"
                      >
                        {t("present")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Leave Submission + CEO / ERP Owner Approval Queue */
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
                  {t("staff")} *
                </label>
                <select
                  required
                  value={leaveUserId}
                  onChange={(e) => setLeaveUserId(e.target.value)}
                  className="royal-input w-full"
                >
                  {records.length === 0 ? (
                    <option value="">{t("noRecords")}</option>
                  ) : (
                    records.map((r) => (
                      <option key={r.userId} value={r.userId}>
                        {r.userName} ({(r.sectionSlug || "").toUpperCase()})
                      </option>
                    ))
                  )}
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

          {/* Leave Requests List & Approval Controls */}
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
                      <span className="font-bold text-base">{lv.userName}</span>
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
                      {lv.status === "approved"
                        ? t("approved")
                        : lv.status === "rejected"
                        ? t("rejected")
                        : t("pending")}
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
    </div>
  );
}
