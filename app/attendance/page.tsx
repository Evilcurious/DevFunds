"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  LogIn,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { ATTENDANCE_STATUS_META, STAFF_STATUS_META } from "@/lib/constants";
import { formatTimeShort, todayInTimezone } from "@/lib/format";
import type {
  AttendanceRecord,
  AttendanceStatus,
  SectionRecord,
} from "@/lib/types";

export default function AttendancePage() {
  const { user, settings, toast } = useApp();
  const [date, setDate] = useState<string>(() =>
    todayInTimezone(settings.timezone)
  );
  const [section, setSection] = useState<string>("all");
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState({
    totalStaff: 0,
    present: 0,
    late: 0,
    halfDay: 0,
    onLeave: 0,
    absent: 0,
    unmarked: 0,
    monthPresent: 0,
    monthLate: 0,
    monthLeave: 0,
    monthAbsent: 0,
  });
  const [loading, setLoading] = useState(true);

  const loadAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?date=${encodeURIComponent(date)}&section=${encodeURIComponent(section)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const json = await res.json();
        setSections(json.sections ?? []);
        setRecords(json.records ?? []);
        if (json.summary) setSummary(json.summary);
      }
    } finally {
      setLoading(false);
    }
  }, [date, section]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const canMarkRow = (row: AttendanceRecord) => {
    if (!user) return false;
    if (user.portalRole === "erp_owner") return true;
    if (user.portalRole === "it_ceo") return row.sectionSlug === "it";
    if (user.portalRole === "bd_ceo") return row.sectionSlug === "bd";
    return false;
  };

  const handleMarkStatus = async (
    row: AttendanceRecord,
    status: AttendanceStatus
  ) => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "mark",
        userId: row.userId,
        workDate: date,
        status,
      }),
    });
    if (res.ok) {
      toast(`${row.userName} marked ${ATTENDANCE_STATUS_META[status].label}`);
      loadAttendance();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Unable to mark attendance", "error");
    }
  };

  const handleSelfAction = async (action: "check_in" | "check_out") => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast(
        action === "check_in"
          ? "Checked in successfully for today!"
          : "Checked out successfully!"
      );
      loadAttendance();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Attendance update failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Attendance Header */}
      <div className="rounded-3xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              <CalendarCheck2 className="h-4 w-4" />
              Daily & Monthly Staff Attendance Ledger
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Attendance Tracking
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track daily check-ins, late arrivals, leaves & absences across BD,
              IT, and all custom staff sections.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />

            {user?.portalRole === "staff" && (
              <>
                <button
                  type="button"
                  onClick={() => handleSelfAction("check_in")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-bold text-white shadow-sm"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Check In</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSelfAction("check_out")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Check Out</span>
                </button>
              </>
            )}

            {!user && (
              <Link
                href="/portals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-bold text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Portal Login to Mark Attendance</span>
              </Link>
            )}
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 p-4 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">
              {summary.totalStaff}
            </div>
            <div className="text-xs font-semibold text-slate-500">Total Staff</div>
          </div>
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-500/10 p-4 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
              {summary.present}
            </div>
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              Present
            </div>
          </div>
          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-500/10 p-4 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-amber-700 dark:text-amber-300">
              {summary.late}
            </div>
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
              Late
            </div>
          </div>
          <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-500/10 p-4 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-indigo-700 dark:text-indigo-300">
              {summary.onLeave + summary.halfDay}
            </div>
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
              Leave / Half
            </div>
          </div>
          <div className="rounded-2xl border border-rose-200/80 dark:border-rose-500/30 bg-rose-50/60 dark:bg-rose-500/10 p-4 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-rose-700 dark:text-rose-300">
              {summary.absent}
            </div>
            <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              Absent
            </div>
          </div>
          <div className="rounded-2xl border border-blue-200/80 dark:border-blue-500/30 bg-blue-50/60 dark:bg-blue-500/10 p-4 text-center">
            <div className="text-2xl font-extrabold tabular-nums text-blue-700 dark:text-blue-300">
              {summary.monthPresent + summary.monthLate}
            </div>
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300">
              Month Present
            </div>
          </div>
        </div>

        {/* Section Filter Tabs */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSection("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ${
              section === "all"
                ? "bg-blue-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            }`}
          >
            All Sections
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSection(sec.slug)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider ${
                section === sec.slug
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {sec.name}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111C35] overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading attendance records...
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck2 className="mx-auto h-10 w-10 text-blue-500" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
              No staff accounts added in this section yet
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Once IT CEO, BD CEO, or ERP Owner creates staff accounts, their
              daily attendance rows appear automatically here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <th className="py-3.5 px-5">Staff Member</th>
                  <th className="py-3.5 px-4">Section</th>
                  <th className="py-3.5 px-4">Live Status</th>
                  <th className="py-3.5 px-4">Check In / Out</th>
                  <th className="py-3.5 px-4">Attendance</th>
                  <th className="py-3.5 px-5 text-right">Mark Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {records.map((row) => {
                  const attMeta = ATTENDANCE_STATUS_META[row.status];
                  const stMeta = STAFF_STATUS_META[row.staffStatus];
                  const editable = canMarkRow(row);

                  return (
                    <tr
                      key={row.userId}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {row.userName}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {row.jobTitle} · {row.userEmail}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="rounded-lg bg-blue-50 dark:bg-blue-500/15 px-2.5 py-1 text-xs font-bold uppercase text-blue-700 dark:text-blue-300">
                          {row.sectionName || row.sectionSlug || "—"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stMeta.pillClass}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${stMeta.dotClass}`}
                          />
                          {stMeta.label}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs tabular-nums text-slate-600 dark:text-slate-300">
                        In: {formatTimeShort(row.checkIn, settings.timezone)} ·
                        Out: {formatTimeShort(row.checkOut, settings.timezone)}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-bold ${attMeta.pillClass}`}
                        >
                          {attMeta.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {editable ? (
                          <div className="inline-flex flex-wrap justify-end gap-1">
                            {(
                              [
                                ["present", "Present"],
                                ["late", "Late"],
                                ["half_day", "Half"],
                                ["on_leave", "Leave"],
                                ["absent", "Absent"],
                              ] as Array<[AttendanceStatus, string]>
                            ).map(([code, label]) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => handleMarkStatus(row, code)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${
                                  row.status === code
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-100 dark:hover:bg-slate-700"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {row.markedByName
                              ? `By ${row.markedByName}`
                              : "View only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
