"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  PortalRole,
  SectionRecord,
  StaffStatus,
  UserRecord,
} from "@/lib/types";

export function StaffModal({
  open,
  onClose,
  onSaved,
  editing,
  actorRole,
  sections,
  defaultSectionSlug,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editing: UserRecord | null;
  actorRole: PortalRole;
  sections: SectionRecord[];
  defaultSectionSlug?: string;
}) {
  const lockedSection =
    actorRole === "it_ceo" ? "it" : actorRole === "bd_ceo" ? "bd" : null;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [portalRole, setPortalRole] = useState<PortalRole>("staff");
  const [jobTitle, setJobTitle] = useState("");
  const [sectionSlug, setSectionSlug] = useState("it");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [bio, setBio] = useState("");
  const [freeTime, setFreeTime] = useState("");
  const [staffStatus, setStaffStatus] = useState<StaffStatus>("active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      setName(editing.name);
      setEmail(editing.email);
      setPassword("");
      setPortalRole(editing.portalRole);
      setJobTitle(editing.jobTitle);
      setSectionSlug(
        lockedSection || editing.sectionSlug || sections[0]?.slug || "it"
      );
      setPhone(editing.phone);
      setLocation(editing.location);
      setSkillsText(editing.skills.join(", "));
      setBio(editing.bio);
      setFreeTime(editing.freeTime);
      setStaffStatus(editing.staffStatus);
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setPortalRole("staff");
      setJobTitle("");
      setSectionSlug(
        lockedSection || defaultSectionSlug || sections[0]?.slug || "it"
      );
      setPhone("");
      setLocation("");
      setSkillsText("");
      setBio("");
      setFreeTime("");
      setStaffStatus("active");
    }
  }, [open, editing, lockedSection, defaultSectionSlug, sections]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/staff/${editing.id}` : "/api/staff";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          ...(password ? { password } : {}),
          portalRole: actorRole === "erp_owner" ? portalRole : "staff",
          jobTitle,
          sectionSlug:
            actorRole === "erp_owner" && portalRole === "erp_owner"
              ? null
              : lockedSection || sectionSlug,
          phone,
          location,
          skills: skillsText,
          bio,
          freeTime,
          staffStatus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Unable to save account.");
        setSaving(false);
        return;
      }
      onSaved();
      onClose();
    } catch {
      setError("Network error while saving staff member.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-blue-600 px-6 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">
              {editing ? `Edit Account — ${editing.name}` : "Create Staff Portal Account"}
            </h2>
            <p className="text-xs text-blue-100">
              Staff can log into Staff Portal using their email & password
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-blue-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-500/15 dark:border-rose-500/30 px-4 py-2.5 text-sm font-medium text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {actorRole === "erp_owner" && !editing && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Portal Account Type
              </label>
              <select
                value={portalRole}
                onChange={(e) => setPortalRole(e.target.value as PortalRole)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="staff">Staff Member (Staff Portal)</option>
                <option value="it_ceo">IT CEO (IT CEO Portal)</option>
                <option value="bd_ceo">BD CEO (BD CEO Portal)</option>
                <option value="erp_owner">ERP Owner (Full Access)</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Hamza Siddiqui"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Role / Designation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior React Developer / BD Closer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Login Email *
              </label>
              <input
                type="email"
                required
                placeholder="staff@devzard.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                {editing ? "Reset Password (Optional)" : "Portal Password *"}
              </label>
              <input
                type="password"
                required={!editing}
                minLength={6}
                placeholder={
                  editing ? "Leave blank to keep unchanged" : "Min 6 characters"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Section / Department
              </label>
              {lockedSection ? (
                <div className="rounded-xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/15 px-3.5 py-2.5 text-sm font-bold text-blue-700 dark:text-blue-300">
                  {lockedSection.toUpperCase()} Section
                </div>
              ) : (
                <select
                  value={sectionSlug}
                  onChange={(e) => setSectionSlug(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                >
                  {sections.map((s) => (
                    <option key={s.id} value={s.slug}>
                      {s.name}
                    </option>
                  ))}
                  {!sections.some((s) => s.slug === "bd") && (
                    <option value="bd">BD</option>
                  )}
                  {!sections.some((s) => s.slug === "it") && (
                    <option value="it">IT</option>
                  )}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Current Availability Status
              </label>
              <select
                value={staffStatus}
                onChange={(e) => setStaffStatus(e.target.value as StaffStatus)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="active">Active</option>
                <option value="free">Free</option>
                <option value="busy">Busy</option>
                <option value="not_available">Not Available</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Phone / WhatsApp Contact
              </label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                City / Free Time Window
              </label>
              <input
                type="text"
                placeholder="e.g. Mon–Fri 3:00 PM – 6:00 PM"
                value={freeTime}
                onChange={(e) => setFreeTime(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Skills (Comma Separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Next.js, TypeScript, PostgreSQL, UI/UX"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              Bio / Role Summary
            </label>
            <textarea
              rows={2}
              placeholder="Short bio or core responsibilities..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-600/20"
            >
              {saving
                ? "Saving..."
                : editing
                ? "Save Staff Updates"
                : "Create Staff Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
