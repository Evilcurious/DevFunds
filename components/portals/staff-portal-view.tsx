"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  LogIn,
  LogOut,
  Plus,
  Save,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { ATTENDANCE_STATUS_META, STAFF_STATUS_META } from "@/lib/constants";
import { formatTimeShort } from "@/lib/format";
import type { AttendanceStatus, StaffStatus } from "@/lib/types";

interface SelfAttendanceRow {
  work_date: string;
  status: AttendanceStatus;
  check_in: string | null;
  check_out: string | null;
  note: string;
}

export function StaffPortalView() {
  const { user, setUser, settings, toast } = useApp();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [freeTime, setFreeTime] = useState(user?.freeTime ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<StaffStatus | null>(
    null
  );
  const [history, setHistory] = useState<SelfAttendanceRow[]>([]);

  useEffect(() => {
    if (!user) return;
    setPhone(user.phone);
    setFreeTime(user.freeTime);
    setBio(user.bio);
    setSkills(user.skills);
  }, [user]);

  const loadMyAttendance = useCallback(async () => {
    const res = await fetch("/api/attendance", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      setHistory(json.selfHistory ?? []);
    }
  }, []);

  useEffect(() => {
    loadMyAttendance();
  }, [loadMyAttendance]);

  if (!user) return null;

  const handleStatusSwitch = async (nextStatus: StaffStatus) => {
    setUpdatingStatus(nextStatus);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffStatus: nextStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        toast(`Status updated to ${STAFF_STATUS_META[nextStatus].label}!`);
      } else {
        toast(data.error || "Could not update status", "error");
      }
    } finally {
      setUpdatingStatus(null);
    }
  };

  const addSkillTag = () => {
    const cleaned = skillInput.trim();
    if (!cleaned) return;
    if (!skills.includes(cleaned)) {
      setSkills((prev) => [...prev, cleaned]);
    }
    setSkillInput("");
  };

  const removeSkillTag = (target: string) => {
    setSkills((prev) => prev.filter((s) => s !== target));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const finalSkills = skillInput.trim()
        ? Array.from(new Set([...skills, skillInput.trim()]))
        : skills;
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          freeTime,
          bio,
          skills: finalSkills,
          ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        setSkills(data.user.skills);
        setSkillInput("");
        setNewPassword("");
        toast("Your skills, bio & free time have been saved!");
      } else {
        toast(data.error || "Failed to update profile", "error");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAttendance = async (action: "check_in" | "check_out") => {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      toast(
        action === "check_in"
          ? "Checked in for today!"
          : "Checked out for today!"
      );
      loadMyAttendance();
    } else {
      toast(data.error || "Attendance update failed", "error");
    }
  };

  const currentStatusMeta = STAFF_STATUS_META[user.staffStatus];

  return (
    <div className="space-y-6">
      {/* Staff Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-600 p-6 sm:p-8 text-white shadow-lg shadow-blue-600/15">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wider">
              Staff Self-Service Portal ·{" "}
              {(user.sectionName || user.sectionSlug || "Team").toUpperCase()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{user.name}</h1>
            <p className="text-sm text-blue-100">
              {user.jobTitle || "Staff Member"} · {user.email}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-extrabold text-blue-700 shadow-xs">
              <span
                className={`h-2.5 w-2.5 rounded-full ${currentStatusMeta.dotClass}`}
              />
              Current Status: {currentStatusMeta.label}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Instant Status Switcher + Daily Attendance Check-in/Out */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs">
          <div className="flex items-center gap-2.5 mb-4">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Update My Live Availability Status
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Instantly updates on the public Staff Directory & CEO Portal
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                "active",
                "free",
                "busy",
                "not_available",
              ] as StaffStatus[]
            ).map((code) => {
              const meta = STAFF_STATUS_META[code];
              const selected = user.staffStatus === code;
              return (
                <button
                  key={code}
                  type="button"
                  disabled={updatingStatus !== null}
                  onClick={() => handleStatusSwitch(code)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                      : "bg-[#F6F9FF] dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 hover:border-blue-400"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`h-3 w-3 rounded-full ${
                        selected ? "bg-white" : meta.dotClass
                      }`}
                    />
                    {selected && <CheckCircle2 className="h-4 w-4 text-white" />}
                  </div>
                  <div className="mt-3 text-sm font-extrabold">{meta.label}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Daily Check In / Check Out */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              My Daily Attendance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mark your daily check-in and check-out timestamps
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleAttendance("check_in")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 py-3 px-4 text-sm font-bold text-white shadow-sm"
              >
                <LogIn className="h-4 w-4" />
                <span>Check In</span>
              </button>

              <button
                type="button"
                onClick={() => handleAttendance("check_out")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-3 px-4 text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400"
              >
                <LogOut className="h-4 w-4" />
                <span>Check Out</span>
              </button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5 max-h-28 overflow-y-auto">
              {history.slice(0, 3).map((item) => (
                <div
                  key={item.work_date}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {item.work_date}
                  </span>
                  <span className="text-slate-500 tabular-nums">
                    In {formatTimeShort(item.check_in, settings.timezone)} · Out{" "}
                    {formatTimeShort(item.check_out, settings.timezone)}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-bold ${
                      ATTENDANCE_STATUS_META[item.status]?.pillClass || ""
                    }`}
                  >
                    {ATTENDANCE_STATUS_META[item.status]?.label || item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Update Skills, Bio & Free Time Form */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 sm:p-7 shadow-xs space-y-5"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              My Skills, Bio & Free Time Window
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Keep your skills, bio, free-time availability, and contact details
              up to date for your team.
            </p>
          </div>
        </div>

        {/* Skills Interactive Editor */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-2">
            My Skills
          </label>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-3 py-1 text-xs font-bold text-blue-700 dark:text-blue-300"
              >
                <span>{skill}</span>
                <button
                  type="button"
                  onClick={() => removeSkillTag(skill)}
                  className="hover:text-rose-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type a skill (e.g. React, Node.js, Lead Closing) and press Add"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkillTag();
                }
              }}
              className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addSkillTag}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-50 dark:bg-blue-500/15 border border-blue-200 dark:border-blue-500/30 px-4 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100"
            >
              <Plus className="h-4 w-4" />
              Add Skill
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Free Time / Availability Schedule
              </span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mon–Fri · 2:00 PM – 5:30 PM PKT"
              value={freeTime}
              onChange={(e) => setFreeTime(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Phone / WhatsApp Contact
            </label>
            <input
              type="text"
              placeholder="+92 300 0000000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            My Bio
          </label>
          <textarea
            rows={3}
            placeholder="Write a concise bio about your role, experience, and current focus..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="max-w-md">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
            Change My Password (Optional)
          </label>
          <input
            type="password"
            placeholder="Leave empty to keep existing password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="submit"
            disabled={savingProfile}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-6 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20"
          >
            <Save className="h-4 w-4" />
            <span>{savingProfile ? "Saving..." : "Save My Profile Updates"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
