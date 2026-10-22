"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  FolderPlus,
  Mail,
  Pencil,
  Phone,
  Search,
  ShieldCheck,
  Split,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { SectionModal } from "@/components/modals/section-modal";
import { StaffModal } from "@/components/modals/staff-modal";
import { ATTENDANCE_STATUS_META, STAFF_STATUS_META } from "@/lib/constants";
import type { SectionRecord, StaffStatus, UserRecord } from "@/lib/types";

export default function StaffDirectoryPage() {
  const { user, toast } = useApp();
  const [sections, setSections] = useState<SectionRecord[]>([]);
  const [staff, setStaff] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
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
      toast(`${member.name} status updated to ${STAFF_STATUS_META[nextStatus].label}`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Unable to update status", "error");
    }
  };

  const handleRemoveSection = async (sec: SectionRecord) => {
    const fallback = sections.find((s) => s.slug !== sec.slug)?.slug || "";
    const msg =
      (sec.staffCount ?? 0) > 0 && fallback
        ? `Remove section "${sec.name}"? Its ${sec.staffCount} staff member(s) will be moved safely to "${fallback.toUpperCase()}".`
        : `Remove section "${sec.name}"?`;
    if (!window.confirm(msg)) return;

    const res = await fetch(
      `/api/sections/${sec.id}?reassignTo=${encodeURIComponent(fallback)}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      toast(`Section "${sec.name}" removed.`);
      if (selectedSection === sec.slug) setSelectedSection("all");
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Failed to remove section", "error");
    }
  };

  const handleDeleteStaff = async (member: UserRecord) => {
    if (
      !window.confirm(
        `Remove staff member "${member.name}" (${member.email}) from the workspace?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`Removed ${member.name}`);
      loadData();
    } else {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Unable to remove staff", "error");
    }
  };

  const handleMoveStaffSection = async (
    member: UserRecord,
    nextSlug: string
  ) => {
    const res = await fetch(`/api/staff/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionSlug: nextSlug }),
    });
    if (res.ok) {
      toast(`Moved ${member.name} to ${nextSlug.toUpperCase()}`);
      loadData();
    } else {
      toast("Unable to move staff member", "error");
    }
  };

  const matchesFilters = (member: UserRecord) => {
    if (statusFilter !== "all" && member.staffStatus !== statusFilter) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = [
        member.name,
        member.jobTitle,
        member.email,
        member.phone,
        member.skills.join(" "),
        member.bio,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const filteredStaff = staff.filter(matchesFilters);

  const visibleSections =
    selectedSection === "all"
      ? sections
      : sections.filter((s) => s.slug === selectedSection);

  const unassignedStaff = filteredStaff.filter(
    (u) => !u.sectionSlug || !sections.some((s) => s.slug === u.sectionSlug)
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="rounded-3xl border border-blue-100 dark:border-slate-800 bg-white dark:bg-[#111C35] p-6 sm:p-7 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <span>Staff Directory & Sections</span>
              <span className="rounded-xl bg-blue-600 px-3 py-1 text-sm font-bold text-white tabular-nums">
                {staff.length} Total
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              All team members organized into{" "}
              <strong className="text-slate-700 dark:text-slate-200">BD</strong>{" "}
              ,{" "}
              <strong className="text-slate-700 dark:text-slate-200">IT</strong>
              , and custom sections — with live availability status, contact
              details, skills, bio & free time.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setSectionModalMode("create");
                    setSectionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/15 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors"
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>+ Add Section</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSectionModalMode("divide");
                    setSectionModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:border-blue-400 transition-colors"
                >
                  <Split className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Divide / Move Staff</span>
                </button>
              </>
            )}

            {canAddAnyStaff ? (
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ New Staff Account</span>
              </button>
            ) : (
              <Link
                href="/portals"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Sign In to Manage Sections & Staff</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter & Section Selector Bar */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedSection("all")}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                selectedSection === "all"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50"
              }`}
            >
              All Sections ({staff.length})
            </button>
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setSelectedSection(sec.slug)}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                  selectedSection === sec.slug
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-blue-50"
                }`}
              >
                {sec.name} ({sec.staffCount ?? 0})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, skill, role..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 pl-9 pr-3.5 py-2 text-xs font-medium text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="free">Free</option>
              <option value="busy">Busy</option>
              <option value="not_available">Not Available</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sections & Staff Cards */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] p-12 text-center text-sm text-slate-500">
          Loading sections and staff roster...
        </div>
      ) : (
        <div className="space-y-8">
          {visibleSections.map((sec) => {
            const members = filteredStaff.filter(
              (m) => m.sectionSlug === sec.slug
            );
            const canManageSec = canCreateStaffIn(sec.slug);

            return (
              <section
                key={sec.id}
                className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#111C35] overflow-hidden shadow-xs"
              >
                {/* Section Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-[#F6F9FF] dark:bg-slate-900/70 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold uppercase text-white">
                      {sec.name.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                          {sec.name} Section
                        </h2>
                        <span className="rounded-full bg-blue-100 dark:bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                          {members.length} Staff
                        </span>
                      </div>
                      {sec.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {sec.description}
                        </p>
                      )}
                    </div>
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
                        className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Add into {sec.name}</span>
                      </button>
                    )}

                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSection(sec)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-300 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Remove Section</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Staff Cards Grid inside Section */}
                {members.length === 0 ? (
                  <div className="p-10 text-center">
                    <Users className="mx-auto h-9 w-9 text-blue-400" />
                    <p className="mt-2.5 text-sm font-bold text-slate-800 dark:text-slate-200">
                      No staff members in {sec.name} yet
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {canManageSec
                        ? `Click "Add into ${sec.name}" above to create a staff portal account.`
                        : `${sec.name} CEO or ERP Owner can add staff accounts via their portal.`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 p-6">
                    {members.map((member) => {
                      const st = STAFF_STATUS_META[member.staffStatus];
                      const att =
                        ATTENDANCE_STATUS_META[
                          member.todayAttendanceStatus ?? "unmarked"
                        ];

                      return (
                        <div
                          key={member.id}
                          className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-[#FAFCFF] dark:bg-slate-900/60 p-5 flex flex-col justify-between gap-4 hover:border-blue-400 transition-all"
                        >
                          <div className="space-y-3.5">
                            {/* Name, Role & Status Pill */}
                            <div className="flex items-start justify-between gap-2.5">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-sky-600 text-sm font-extrabold text-white">
                                  {member.name
                                    .split(" ")
                                    .map((p) => p[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <h3 className="truncate text-base font-bold text-slate-900 dark:text-white">
                                    {member.name}
                                  </h3>
                                  <p className="truncate text-xs font-semibold text-blue-600 dark:text-blue-400">
                                    {member.jobTitle || "Staff Member"}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${st.pillClass}`}
                              >
                                <span
                                  className={`h-2 w-2 rounded-full ${st.dotClass}`}
                                />
                                {st.label}
                              </span>
                            </div>

                            {/* Contact Details */}
                            <div className="rounded-xl bg-white dark:bg-[#111C35] border border-slate-200/70 dark:border-slate-800 p-3 space-y-1.5 text-xs">
                              <a
                                href={`mailto:${member.email}`}
                                className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 truncate"
                              >
                                <Mail className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span className="truncate">{member.email}</span>
                              </a>
                              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                <Phone className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                                <span>
                                  {member.phone || "Phone not set yet"}
                                </span>
                              </div>
                              {member.freeTime && (
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                  <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>Free time: {member.freeTime}</span>
                                </div>
                              )}
                            </div>

                            {/* Bio */}
                            {member.bio && (
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                                {member.bio}
                              </p>
                            )}

                            {/* Skills Tags */}
                            <div>
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                                Skills
                              </div>
                              {member.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {member.skills.map((skill, idx) => (
                                    <span
                                      key={`${skill}-${idx}`}
                                      className="rounded-lg bg-blue-50 dark:bg-blue-500/15 border border-blue-200/80 dark:border-blue-500/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs italic text-slate-400">
                                  No skills listed yet
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Footer: Attendance + Quick CEO / Owner Controls */}
                          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400">
                                Today Attendance:
                              </span>
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-bold ${att.pillClass}`}
                              >
                                {att.label}
                              </span>
                            </div>

                            {canManageSec && (
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                <select
                                  aria-label={`Change status for ${member.name}`}
                                  value={member.staffStatus}
                                  onChange={(e) =>
                                    handleQuickStatusChange(
                                      member,
                                      e.target.value as StaffStatus
                                    )
                                  }
                                  className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200"
                                >
                                  <option value="active">Status: Active</option>
                                  <option value="free">Status: Free</option>
                                  <option value="busy">Status: Busy</option>
                                  <option value="not_available">
                                    Status: Not Available
                                  </option>
                                </select>

                                <div className="flex items-center gap-1">
                                  {isOwner && sections.length > 1 && (
                                    <select
                                      aria-label={`Move ${member.name} section`}
                                      value={member.sectionSlug || ""}
                                      onChange={(e) =>
                                        handleMoveStaffSection(
                                          member,
                                          e.target.value
                                        )
                                      }
                                      className="rounded-lg border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300"
                                    >
                                      {sections.map((s) => (
                                        <option key={s.id} value={s.slug}>
                                          → {s.name}
                                        </option>
                                      ))}
                                    </select>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingStaff(member);
                                      setStaffModalOpen(true);
                                    }}
                                    title="Edit Staff Details"
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteStaff(member)}
                                    title="Remove Staff Member"
                                    className="rounded-lg border border-slate-200 dark:border-slate-700 p-1.5 text-slate-500 hover:border-rose-300 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
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

          {unassignedStaff.length > 0 && selectedSection === "all" && (
            <section className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-white dark:bg-[#111C35] p-6">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
                Unassigned Staff ({unassignedStaff.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {unassignedStaff.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-sm">{m.name}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </div>
                    {isOwner && sections[0] && (
                      <button
                        type="button"
                        onClick={() =>
                          handleMoveStaffSection(m, sections[0].slug)
                        }
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white"
                      >
                        Assign to {sections[0].name}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {user && (
        <StaffModal
          open={staffModalOpen}
          onClose={() => setStaffModalOpen(false)}
          onSaved={() => {
            toast(
              editingStaff ? "Staff profile updated." : "Staff account created!"
            );
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
            toast(
              sectionModalMode === "create"
                ? "New section added!"
                : "Staff reassigned across sections!"
            );
            loadData();
          }}
          sections={sections}
          staffList={staff}
        />
      )}
    </div>
  );
}
