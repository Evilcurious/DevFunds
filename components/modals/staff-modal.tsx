"use client";

import React, { useEffect, useState } from "react";
import { Camera, X } from "lucide-react";
import { UserAvatar, resizeAvatarFile } from "@/components/user-avatar";
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

  const [avatarUrl, setAvatarUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [portalRole, setPortalRole] = useState<PortalRole>("staff");
  const [jobTitle, setJobTitle] = useState("");
  const [sectionSlug, setSectionSlug] = useState("it");
  const [phone, setPhone] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [bio, setBio] = useState("");
  const [freeTime, setFreeTime] = useState("");
  const [staffStatus, setStaffStatus] = useState<StaffStatus>("free");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (editing) {
      setAvatarUrl(editing.avatarUrl || "");
      setName(editing.name);
      setEmail(editing.email);
      setPassword("");
      setPortalRole(editing.portalRole);
      setJobTitle(editing.jobTitle);
      setSectionSlug(
        lockedSection || editing.sectionSlug || sections[0]?.slug || "it"
      );
      setPhone(editing.phone);
      setSkillsText(editing.skills.join(", "));
      setBio(editing.bio);
      setFreeTime(editing.freeTime);
      setStaffStatus(editing.staffStatus);
    } else {
      setAvatarUrl("");
      setName("");
      setEmail("");
      setPassword("");
      setPortalRole("staff");
      setJobTitle("");
      setSectionSlug(
        lockedSection || defaultSectionSlug || sections[0]?.slug || "it"
      );
      setPhone("");
      setSkillsText("");
      setBio("");
      setFreeTime("");
      setStaffStatus("free");
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
          avatarUrl,
          email,
          ...(password ? { password } : {}),
          portalRole: actorRole === "erp_owner" ? portalRole : "staff",
          jobTitle,
          sectionSlug:
            actorRole === "erp_owner" && portalRole === "erp_owner"
              ? null
              : lockedSection || sectionSlug,
          phone,
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
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <div className="royal-card w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-bold">
            {editing ? `Edit — ${editing.name}` : "Add Account"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
        >
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          {/* Profile Picture Upload */}
          <div className="royal-elevated rounded-xl p-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar name={name || "User"} avatarUrl={avatarUrl} size="md" />
              <span className="text-xs font-semibold text-muted-royal">
                Profile Picture
              </span>
            </div>
            <label className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer">
              <Camera className="h-3.5 w-3.5 gold-accent" />
              <span>Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) resizeAvatarFile(file, setAvatarUrl);
                }}
                className="hidden"
              />
            </label>
          </div>

          {actorRole === "erp_owner" && !editing && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Portal Role
              </label>
              <select
                value={portalRole}
                onChange={(e) => setPortalRole(e.target.value as PortalRole)}
                className="royal-input w-full"
              >
                <option value="staff">Staff</option>
                <option value="it_ceo">IT CEO</option>
                <option value="bd_ceo">BD CEO</option>
                <option value="erp_owner">ERP Owner</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Name *
              </label>
              <input
                type="text"
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="royal-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Role Title *
              </label>
              <input
                type="text"
                required
                placeholder="Role / title"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="royal-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Email *
              </label>
              <input
                type="email"
                required
                placeholder="email@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="royal-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                {editing ? "New Password" : "Password *"}
              </label>
              <input
                type="password"
                required={!editing}
                minLength={6}
                placeholder={editing ? "Optional" : "Min 6 characters"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="royal-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Section
              </label>
              {lockedSection ? (
                <div className="royal-elevated rounded-xl px-3.5 py-2.5 text-sm font-bold uppercase">
                  {lockedSection}
                </div>
              ) : (
                <select
                  value={sectionSlug}
                  onChange={(e) => setSectionSlug(e.target.value)}
                  className="royal-input w-full"
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Status
              </label>
              <select
                value={staffStatus}
                onChange={(e) => setStaffStatus(e.target.value as StaffStatus)}
                className="royal-input w-full"
              >
                <option value="free">Free</option>
                <option value="working">Working</option>
                <option value="offline">Offline</option>
                <option value="active">Active</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Free Time
              </label>
              <input
                type="text"
                placeholder="e.g. 3:00 PM – 6:00 PM"
                value={freeTime}
                onChange={(e) => setFreeTime(e.target.value)}
                className="royal-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Skills
            </label>
            <input
              type="text"
              placeholder="Comma separated skills"
              value={skillsText}
              onChange={(e) => setSkillsText(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Bio
            </label>
            <textarea
              rows={2}
              placeholder="Short bio..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="royal-btn-outline rounded-xl px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="royal-btn rounded-xl px-5 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
