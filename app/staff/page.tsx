"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Clock,
  Crown,
  FolderPlus,
  Mail,
  Pencil,
  Phone,
  Search,
  Split,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { SectionModal } from "@/components/modals/section-modal";
import { StaffModal } from "@/components/modals/staff-modal";
import { UserAvatar } from "@/components/user-avatar";
import { STAFF_STATUS_META } from "@/lib/constants";
import type { SectionRecord, StaffStatus, UserRecord } from "@/lib/types";

export default function StaffDirectoryPage() {
  const { user, lang, t, toast } = useApp();
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [ceos, setCeos] = useState<UserRecord[]>([]);
  const [staff, setStaff] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<UserRecord | null>(null);
  const [defaultModalSection, setDefaultModalSection] = useState<string>("bd");

  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionModalMode, setSectionModalMode] = useState<"create" | "divide">(
    "create"
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setSections(json.sections ?? []);
        setCeos(json.ceos ?? []);
        setStaff(json.staff ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = user?.portalRole === "erp_owner";
  const canCreateStaffIn = (slug: string) => {
    if (!user) return false;
    if (user.portalRole === "erp_owner") return true;
    if (user.portalRole === "it_ceo") return slug === "it";
    if (user.portalRole === "bd_ceo") return slug === "bd";
    return false;
  };

  const canAddAnyStaff =
    user?.portalRole === "erp_owner" ||
    user?.portalRole === "it_ceo" ||
    user?.portalRole === "bd_ceo";

  const handleQuickStatusChange = async (
    member: UserRecord,
    nextStatus: StaffStatus
  ) => {
    const res = await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffStatus: nextStatus }),
    });
    if (res.ok) {
      toast(`${member.name} → ${STAFF_STATUS_META[nextStatus].label}`);
      loadData();
    }
  };

  const handleRemoveSection = async (sec: SectionRecord) => {
    const fallback = sections.find((s) => s.slug !== sec.slug)?.slug || "";
    if (!window.confirm(`Remove section "${sec.name}"?`)) return;
    const res = await fetch(
      `/api/sections/${sec.id}?reassignTo=${encodeURIComponent(fallback)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast(`Removed ${sec.name}`);
      if (selectedSection === sec.slug) setSelectedSection("all");
      loadData();
    }
  };

  const handleDeleteStaff = async (member: UserRecord) => {
    if (!window.confirm(`Remove ${member.name}?`)) return;
    const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`Removed ${member.name}`);
      loadData();
    }
  };

  const matchQuery = (member: UserRecord) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${member.name} ${member.jobTitle} ${member.email} ${member.skills.join(" ")}`
      .toLowerCase()
      .includes(q);
  };

  const filteredCeos = ceos.filter(matchQuery);
  const filteredStaff = staff.filter(matchQuery);

  const visibleSections =
    selectedSection === "all"
      ? sections
      : sections.filter((s) => s.slug === selectedSection);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("staff")} ({ceos.length + staff.length})
          </h1>
          <div className="gold-line w-24" />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSectionModalMode("create");
                  setSectionModalOpen(true);
                }}
                className="royal-btn-outline inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs"
              >
                <FolderPlus className="h-3.5 w-3.5 gold-accent" />
                <span>{t("addSection")}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSectionModalMode("divide");
                  setSectionModalOpen(true);
                }}
                className="royal-btn-outline inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs"
              >
                <Split className="h-3.5 w-3.5 gold-accent" />
                <span>{t("divideStaff")}</span>
              </button>
            </>
          )}

          {canAddAnyStaff && (
            <button
              type="button"
              onClick={() => {
                setEditingStaff(null);
                setDefaultModalSection(
                  user?.portalRole === "it_ceo"
                    ? "it"
                    : user?.portalRole === "bd_ceo"
                    ? "bd"
                    : selectedSection !== "all"
                    ? selectedSection
                    : sections[0]?.slug || "bd"
                );
                setStaffModalOpen(true);
              }}
              className="royal-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>{t("addStaff")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedSection("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${
              selectedSection === "all" ? "royal-btn" : "royal-btn-outline"
            }`}
          >
            {t("allSections")}
          </button>
          {sections.map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setSelectedSection(sec.slug)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider ${
                selectedSection === sec.slug ? "royal-btn" : "royal-btn-outline"
              }`}
            >
              {sec.name} ({sec.staffCount ?? 0})
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-royal" />
          <input
            type="text"
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="royal-input w-full ps-9 py-2 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="royal-card rounded-2xl p-12 text-center text-sm text-muted-royal">
          ...
        </div>
      ) : (
        <div className="space-y-8">
          {/* TOP SECTION ABOVE ALL OTHERS: EXECUTIVE LEADERSHIP — IT CEO & BD CEO */}
          {filteredCeos.length > 0 && (
            <section
              style={{ borderColor: "var(--accent-secondary)" }}
              className="royal-card rounded-3xl overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <Crown className="h-5 w-5 gold-accent" />
                  <h2 className="text-base font-extrabold uppercase tracking-widest gold-accent">
                    Executive Leadership — CEOs
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
                {filteredCeos.map((ceo) => {
                  const st = STAFF_STATUS_META[ceo.staffStatus];
                  const ceoTitle =
                    ceo.portalRole === "it_ceo" ? "IT CEO" : "BD CEO";
                  const markedToday =
                    ceo.todayAttendanceStatus === "present" ||
                    ceo.todayAttendanceStatus === "late";

                  return (
                    <div
                      key={ceo.id}
                      className="royal-elevated rounded-2xl p-5 flex flex-col justify-between gap-4"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/staff/${ceo.id}`}
                            className="flex items-center gap-3.5 min-w-0 group"
                          >
                            <UserAvatar
                              name={ceo.name}
                              avatarUrl={ceo.avatarUrl}
                              size="lg"
                              glowing={markedToday}
                            />
                            <div className="min-w-0 space-y-1">
                              <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-secondary)] px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider gold-accent">
                                <Crown className="h-3 w-3" />
                                {ceoTitle}
                              </span>
                              <h3
                                className={`truncate text-lg font-extrabold group-hover:underline ${
                                  markedToday ? "attendance-glow-name" : ""
                                }`}
                              >
                                {ceo.name}
                              </h3>
                            </div>
                          </Link>

                          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-bold">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: st.dotColor }}
                            />
                            {lang === "ur" ? st.urduLabel : st.label}
                          </span>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-3 text-center">
                          <Link
                            href={`/staff/${ceo.id}`}
                            className="royal-card rounded-xl py-2.5 px-3 hover:border-[var(--accent-primary)] transition-colors"
                          >
                            <div className="text-lg font-extrabold tabular-nums text-emerald-400">
                              {ceo.attendanceRate ?? 0}%
                            </div>
                            <div className="text-[11px] text-muted-royal">
                              {t("attendanceRate")}
                            </div>
                          </Link>

                          <Link
                            href={`/staff/${ceo.id}`}
                            className="royal-card rounded-xl py-2.5 px-3 hover:border-[var(--accent-primary)] transition-colors"
                          >
                            <div className="text-lg font-extrabold tabular-nums gold-accent">
                              {ceo.presentDaysCount ?? 0}
                            </div>
                            <div className="text-[11px] text-muted-royal">
                              Days {t("present")}
                            </div>
                          </Link>
                        </div>

                        <div className="space-y-1 text-xs text-muted-royal">
                          <a
                            href={`mailto:${ceo.email}`}
                            className="flex items-center gap-2 hover:underline truncate"
                          >
                            <Mail className="h-3.5 w-3.5 gold-accent shrink-0" />
                            <span className="truncate">{ceo.email}</span>
                          </a>
                          {ceo.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 gold-accent shrink-0" />
                              <span>{ceo.phone}</span>
                            </div>
                          )}
                        </div>

                        {ceo.bio && (
                          <p className="text-xs text-muted-royal line-clamp-2">
                            {ceo.bio}
                          </p>
                        )}

                        {ceo.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {ceo.skills.map((skill, idx) => (
                              <span
                                key={`${skill}-${idx}`}
                                className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] font-medium"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
                        <Link
                          href={`/staff/${ceo.id}`}
                          className="inline-flex items-center gap-1 text-xs font-bold gold-accent hover:underline"
                        >
                          <span>{t("viewProfile")}</span>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>

                        {isOwner && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaff(ceo);
                              setStaffModalOpen(true);
                            }}
                            className="royal-btn-outline rounded-lg px-2.5 py-1 text-xs inline-flex items-center gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* TEAM SECTIONS BELOW CEOS (BD, IT & Custom Sections) */}
          {visibleSections.map((sec) => {
            const members = filteredStaff.filter(
              (m) => m.sectionSlug === sec.slug
            );
            const canManageSec = canCreateStaffIn(sec.slug);

            return (
              <section
                key={sec.id}
                className="royal-card rounded-3xl overflow-hidden"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      style={{
                        borderColor: "var(--accent-secondary)",
                        color: "var(--accent-secondary)",
                      }}
                      className="rounded-lg border px-2.5 py-1 text-xs font-bold uppercase tracking-widest"
                    >
                      {sec.name}
                    </span>
                    <span className="text-xs text-muted-royal">
                      ({members.length})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageSec && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaff(null);
                          setDefaultModalSection(sec.slug);
                          setStaffModalOpen(true);
                        }}
                        className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>+ {sec.name}</span>
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sec)}
                        className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs text-rose-400 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>{t("removeSection")}</span>
                      </button>
                    )}
                  </div>
                </div>

                {members.length === 0 ? (
                  <div className="p-10 text-center text-xs text-muted-royal">
                    {t("noRecords")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                    {members.map((member) => {
                      const st = STAFF_STATUS_META[member.staffStatus];
                      const markedToday =
                        member.todayAttendanceStatus === "present" ||
                        member.todayAttendanceStatus === "late";

                      return (
                        <div
                          key={member.id}
                          className="royal-elevated rounded-2xl p-5 flex flex-col justify-between gap-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              {/* Clickable Avatar + Name -> Opens Profile */}
                              <Link
                                href={`/staff/${member.id}`}
                                className="flex items-center gap-3 min-w-0 group"
                              >
                                <UserAvatar
                                  name={member.name}
                                  avatarUrl={member.avatarUrl}
                                  size="md"
                                  glowing={markedToday}
                                />
                                <div className="min-w-0">
                                  <h3
                                    className={`truncate text-base font-bold group-hover:underline ${
                                      markedToday ? "attendance-glow-name" : ""
                                    }`}
                                  >
                                    {member.name}
                                  </h3>
                                  <p className="truncate text-xs gold-accent">
                                    {member.jobTitle}
                                  </p>
                                </div>
                              </Link>

                              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 text-[11px] font-semibold">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: st.dotColor }}
                                />
                                {lang === "ur" ? st.urduLabel : st.label}
                              </span>
                            </div>

                            {/* Stats Pills */}
                            <div className="grid grid-cols-2 gap-2 text-center">
                              <Link
                                href={`/staff/${member.id}`}
                                className="royal-card rounded-xl py-2 px-2 hover:border-[var(--accent-primary)] transition-colors"
                              >
                                <div className="text-base font-bold tabular-nums gold-accent">
                                  {member.acceptedTasksCount ?? 0}
                                </div>
                                <div className="text-[10px] text-muted-royal">
                                  {t("tasksAccepted")}
                                </div>
                              </Link>

                              <Link
                                href={`/staff/${member.id}`}
                                className="royal-card rounded-xl py-2 px-2 hover:border-[var(--accent-primary)] transition-colors"
                              >
                                <div className="text-base font-bold tabular-nums text-emerald-400">
                                  {member.attendanceRate ?? 0}%
                                </div>
                                <div className="text-[10px] text-muted-royal">
                                  {t("attendanceRate")}
                                </div>
                              </Link>
                            </div>

                            <div className="space-y-1 text-xs text-muted-royal">
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-2 hover:underline truncate"
                              >
                                <Mail className="h-3.5 w-3.5 gold-accent shrink-0" />
                                <span className="truncate">{member.email}</span>
                              </a>
                              {member.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-3.5 w-3.5 gold-accent shrink-0" />
                                  <span>{member.phone}</span>
                                </div>
                              )}
                              {member.freeTime && (
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                  <span>{member.freeTime}</span>
                                </div>
                              )}
                            </div>

                            {member.bio && (
                              <p className="text-xs text-muted-royal line-clamp-2">
                                {member.bio}
                              </p>
                            )}

                            {member.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {member.skills.slice(0, 6).map((skill, idx) => (
                                  <span
                                    key={`${skill}-${idx}`}
                                    className="rounded-md border border-[var(--border-subtle)] px-2 py-0.5 text-[11px] font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--border-subtle)]">
                            <Link
                              href={`/staff/${member.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold gold-accent hover:underline"
                            >
                              <span>{t("viewProfile")}</span>
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Link>

                            {canManageSec && (
                              <div className="flex items-center gap-1">
                                <select
                                  value={member.staffStatus}
                                  onChange={(e) =>
                                    handleQuickStatusChange(
                                      member,
                                      e.target.value as StaffStatus
                                    )
                                  }
                                  className="royal-input py-1 px-2 text-xs"
                                >
                                  <option value="free">Free</option>
                                  <option value="working">Working</option>
                                  <option value="offline">Offline</option>
                                  <option value="active">Active</option>
                                </select>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStaff(member);
                                    setStaffModalOpen(true);
                                  }}
                                  className="royal-btn-outline rounded-lg p-1.5"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaff(member)}
                                  className="royal-btn-outline rounded-lg p-1.5 text-rose-400"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {user && (
        <StaffModal
          open={staffModalOpen}
          onClose={() => setStaffModalOpen(false)}
          onSaved={() => {
            toast("Saved");
            loadData();
          }}
          editing={editingStaff}
          actorRole={user.portalRole}
          sections={sections}
          defaultSectionSlug={defaultModalSection}
        />
      )}

      {isOwner && (
        <SectionModal
          open={sectionModalOpen}
          mode={sectionModalMode}
          onClose={() => setSectionModalOpen(false)}
          onSaved={() => {
            toast("Saved");
            loadData();
          }}
          sections={sections}
          staffList={staff}
        />
      )}
    </div>
  );
}
