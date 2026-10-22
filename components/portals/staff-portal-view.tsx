"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  BellRing,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Plus,
  Save,
  Send,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { LEAVE_TYPES, STAFF_STATUS_META } from "@/lib/constants";
import { todayInTimezone } from "@/lib/format";
import type {
  LeaveRequestRecord,
  StaffStatus,
  TaskRecord,
  TaskStatus,
} from "@/lib/types";

export function StaffPortalView() {
  const {
    user,
    setUser,
    settings,
    lang,
    t,
    toast,
    requestBrowserNotifications,
    browserNotifPermission,
  } = useApp();

  const [phone, setPhone] = useState(user?.phone ?? "");
  const [freeTime, setFreeTime] = useState(user?.freeTime ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    setPhone(user.phone);
    setFreeTime(user.freeTime);
    setBio(user.bio);
    setSkills(user.skills);
  }, [user]);

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
      const me = (json.records ?? []).find(
        (r: { userId: string; status: string }) => r.userId === user.id
      );
      setTodayPresent(me?.status === "present");
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

  const handleTaskStatus = async (task: TaskRecord, status: TaskStatus) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast("Updated");
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

  const addSkillTag = () => {
    const cleaned = skillInput.trim();
    if (!cleaned) return;
    if (!skills.includes(cleaned)) {
      setSkills((prev) => [...prev, cleaned]);
    }
    setSkillInput("");
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
        toast("Saved");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. PORTAL INBOX: Assigned Work from BD Todo / IT Todo */}
      <div className="royal-card rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2.5">
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
                  className="royal-btn-outline rounded-xl px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <BellRing className="h-3.5 w-3.5 gold-accent" />
                  <span>{t("enableAlerts")}</span>
                </button>
              )}

            {todayPresent ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-bold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("present")}
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
          <p className="py-6 text-center text-xs text-muted-royal">
            {t("noRecords")}
          </p>
        ) : (
          <div className="space-y-3">
            {inboxTasks.map((task) => (
              <div
                key={task.id}
                className="royal-elevated rounded-xl p-4 space-y-2.5"
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

                  <div className="flex items-center gap-1.5">
                    {(
                      [
                        ["pending", t("pending")],
                        ["in_progress", t("inProgress")],
                        ["completed", t("completed")],
                      ] as Array<[TaskStatus, string]>
                    ).map(([st, label]) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleTaskStatus(task, st)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          task.status === st ? "royal-btn" : "royal-btn-outline"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {task.description && (
                  <p className="text-xs sm:text-sm text-muted-royal whitespace-pre-line">
                    {task.description}
                  </p>
                )}

                {task.referenceLink && (
                  <a
                    href={task.referenceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs gold-accent hover:underline"
                  >
                    <span>Link</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Live Status Switcher */}
      <div className="royal-card rounded-2xl p-6 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            ["active", "free", "busy", "not_available"] as StaffStatus[]
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

      {/* 3. Profile (Skills, Bio & Free Time) + Leave Request */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleSaveProfile}
          className="lg:col-span-7 royal-card rounded-2xl p-6 space-y-4"
        >
          <h2 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
            {t("skills")}, {t("bio")} & {t("freeTime")}
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-2">
              {t("skills")}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="royal-elevated inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSkills((prev) => prev.filter((s) => s !== skill))
                    }
                    className="text-rose-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Skill..."
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkillTag();
                  }
                }}
                className="royal-input flex-1"
              />
              <button
                type="button"
                onClick={addSkillTag}
                className="royal-btn-outline rounded-xl px-3.5 py-2 text-xs inline-flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                {t("freeTime")}
              </label>
              <input
                type="text"
                placeholder="3:00 PM – 6:00 PM"
                value={freeTime}
                onChange={(e) => setFreeTime(e.target.value)}
                className="royal-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Phone
              </label>
              <input
                type="text"
                placeholder="+92..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="royal-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              {t("bio")}
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              {t("password")}
            </label>
            <input
              type="password"
              placeholder="Optional"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="royal-btn rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingProfile ? "..." : t("save")}</span>
          </button>
        </form>

        {/* Submit Leave Card */}
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
  );
}
