"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  Mail,
  Phone,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { UserAvatar } from "@/components/user-avatar";
import { ATTENDANCE_STATUS_META, STAFF_STATUS_META } from "@/lib/constants";
import { formatTimeShort } from "@/lib/format";
import type {
  AttendanceStatus,
  StaffStatus,
  TaskRecord,
  UserRecord,
} from "@/lib/types";

interface ProfileAttendanceItem {
  workDate: string;
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
}

export default function StaffPublicProfilePage() {
  const params = useParams<{ id: string }>();
  const { user, settings, lang, t, toast } = useApp();

  const [profile, setProfile] = useState<UserRecord | null>(null);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [history, setHistory] = useState<ProfileAttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/${params.id}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setProfile(json.profile ?? null);
        setTasks(json.tasks ?? []);
        setHistory(json.attendanceHistory ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const canChangeStatus =
    user &&
    profile &&
    (user.portalRole === "erp_owner" ||
      (user.portalRole === "it_ceo" && profile.sectionSlug === "it") ||
      (user.portalRole === "bd_ceo" && profile.sectionSlug === "bd"));

  const handleCeoStatusChange = async (nextStatus: StaffStatus) => {
    if (!profile) return;
    const res = await fetch(`/api/staff/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffStatus: nextStatus }),
    });
    if (res.ok) {
      toast(`${profile.name} → ${STAFF_STATUS_META[nextStatus].label}`);
      loadProfile();
    }
  };

  if (loading) {
    return (
      <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
        ...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="royal-card rounded-2xl p-12 text-center space-y-3">
        <p className="text-sm text-muted-royal">Profile not found.</p>
        <Link
          href="/staff"
          className="royal-btn inline-block rounded-xl px-4 py-2 text-xs"
        >
          Back
        </Link>
      </div>
    );
  }

  const stMeta = STAFF_STATUS_META[profile.staffStatus];
  const roleBadge =
    profile.portalRole === "it_ceo"
      ? "IT CEO"
      : profile.portalRole === "bd_ceo"
      ? "BD CEO"
      : profile.portalRole === "erp_owner"
      ? "ERP Owner"
      : profile.sectionName || profile.sectionSlug?.toUpperCase() || "Staff";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Link
        href="/staff"
        className="inline-flex items-center gap-1.5 text-xs font-semibold gold-accent hover:underline"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>{t("staff")}</span>
      </Link>

      {/* Main Profile Header Card */}
      <div className="royal-card rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={profile.name}
              avatarUrl={profile.avatarUrl}
              size="xl"
            />
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-extrabold">{profile.name}</h1>
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-secondary)] px-2.5 py-0.5 text-xs font-bold uppercase gold-accent">
                  {(profile.portalRole === "it_ceo" ||
                    profile.portalRole === "bd_ceo") && (
                    <Crown className="h-3 w-3" />
                  )}
                  {roleBadge}
                </span>
              </div>
              <p className="text-sm text-muted-royal mt-0.5">
                {profile.jobTitle}
              </p>
            </div>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-1.5 text-sm font-bold">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: stMeta.dotColor }}
            />
            {lang === "ur" ? stMeta.urduLabel : stMeta.label}
          </span>
        </div>

        {/* CEO / ERP Owner Direct Status Control */}
        {canChangeStatus && (
          <div className="royal-elevated rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-royal">
              Status Control
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {(
                ["working", "free", "offline", "active"] as StaffStatus[]
              ).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleCeoStatusChange(st)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold ${
                    profile.staffStatus === st
                      ? "royal-btn"
                      : "royal-btn-outline"
                  }`}
                >
                  {STAFF_STATUS_META[st].label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics: Todo Tasks Accepted & Attendance Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="royal-elevated rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-royal">
                {t("tasksAccepted")}
              </div>
              <div className="mt-2 text-3xl font-extrabold tabular-nums gold-accent">
                {profile.acceptedTasksCount ?? 0}
              </div>
              <div className="text-xs text-muted-royal mt-1">
                {profile.completedTasksCount ?? 0} submitted / completed
              </div>
            </div>
            <CheckCircle2 className="h-8 w-8 gold-accent opacity-80" />
          </div>

          <div className="royal-elevated rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted-royal">
                {t("attendanceRate")}
              </div>
              <div className="mt-2 text-3xl font-extrabold tabular-nums text-emerald-400">
                {profile.attendanceRate ?? 0}%
              </div>
              <div className="text-xs text-muted-royal mt-1">
                {profile.presentDaysCount ?? 0} days marked present
              </div>
            </div>
            <CalendarCheck2 className="h-8 w-8 text-emerald-400 opacity-80" />
          </div>
        </div>

        {/* Bio, Contact & Skills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
          <div className="space-y-2 text-sm">
            <a
              href={`mailto:${profile.email}`}
              className="flex items-center gap-2.5 text-muted-royal hover:underline"
            >
              <Mail className="h-4 w-4 gold-accent shrink-0" />
              <span>{profile.email}</span>
            </a>
            {profile.phone && (
              <div className="flex items-center gap-2.5 text-muted-royal">
                <Phone className="h-4 w-4 gold-accent shrink-0" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.freeTime && (
              <div className="flex items-center gap-2.5 text-muted-royal">
                <Clock className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{profile.freeTime}</span>
              </div>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-muted-royal leading-relaxed">
              {profile.bio}
            </p>
          )}
        </div>

        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((skill, idx) => (
              <span
                key={`${skill}-${idx}`}
                className="royal-elevated rounded-lg px-3 py-1 text-xs font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Accepted Tasks & Attendance History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="royal-card rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
            {t("tasksAccepted")} ({tasks.length})
          </h2>

          {tasks.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-royal">
              {t("noRecords")}
            </p>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((tk) => (
                <div
                  key={tk.id}
                  className="royal-elevated rounded-xl p-3.5 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm">{tk.title}</span>
                    <span
                      className={`uppercase font-bold ${
                        (tk.viewerStatus ?? tk.status) === "completed"
                          ? "attendance-glow-name"
                          : "gold-accent"
                      }`}
                    >
                      {tk.viewerStatus ?? tk.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-[10px] text-muted-royal uppercase font-bold">
                    <span>{tk.sectionSlug} · {tk.priority}</span>
                    {tk.requestKind === "cross" && (
                      <span>
                        {tk.originSection.toUpperCase()} →{" "}
                        {tk.sectionSlug.toUpperCase()} request
                      </span>
                    )}
                    {tk.assignees.length > 1 && (
                      <span className="normal-case">
                        Shared with {tk.assignees.length} members
                      </span>
                    )}
                  </div>
                  {tk.submissionLink && (
                    <a
                      href={tk.submissionLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 gold-accent hover:underline"
                    >
                      <span>Submitted Work</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="royal-card rounded-2xl p-6 space-y-3">
          <h2 className="text-base font-bold border-b border-[var(--border-subtle)] pb-3">
            {t("attendance")} ({history.length})
          </h2>

          {history.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-royal">
              {t("noRecords")}
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.map((h) => {
                const meta =
                  ATTENDANCE_STATUS_META[h.status] ??
                  ATTENDANCE_STATUS_META.present;
                return (
                  <div
                    key={h.workDate}
                    className="royal-elevated rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold tabular-nums">
                        {h.workDate}
                      </span>
                      {h.checkIn && (
                        <span className="ms-2 text-muted-royal tabular-nums">
                          · {formatTimeShort(h.checkIn, settings.timezone)}
                        </span>
                      )}
                    </div>
                    <span
                      style={{ color: meta.color }}
                      className="font-bold uppercase"
                    >
                      {lang === "ur" ? meta.urduLabel : meta.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
