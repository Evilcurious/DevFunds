"use client";

import React, { useEffect, useState } from "react";
import { Check, KeyRound, Mail, Plus, Save, User, X } from "lucide-react";
import { useApp } from "@/components/app-context";
import { STAFF_STATUS_META } from "@/lib/constants";
import type { StaffStatus } from "@/lib/types";

export function AccountSettingsPanel() {
  const { user, setUser, lang, t, toast } = useApp();

  // 1. Name, Status, Bio, Skills, Free Time, Phone
  const [name, setName] = useState(user?.name ?? "");
  const [staffStatus, setStaffStatus] = useState<StaffStatus>(
    user?.staffStatus ?? "free"
  );
  const [bio, setBio] = useState(user?.bio ?? "");
  const [freeTime, setFreeTime] = useState(user?.freeTime ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [skills, setSkills] = useState<string[]>(user?.skills ?? []);
  const [skillInput, setSkillInput] = useState("");
  const [editingSkillIdx, setEditingSkillIdx] = useState<number | null>(null);
  const [editingSkillVal, setEditingSkillVal] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // 2. Email change (requires current password)
  const [newEmail, setNewEmail] = useState(user?.email ?? "");
  const [emailPassword, setEmailPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  // 3. Password change (requires old password + new password twice)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setStaffStatus(user.staffStatus);
    setBio(user.bio);
    setFreeTime(user.freeTime);
    setPhone(user.phone);
    setSkills(user.skills);
    setNewEmail(user.email);
  }, [user]);

  if (!user) return null;

  const addSkill = () => {
    const cleaned = skillInput.trim();
    if (!cleaned) return;
    if (!skills.includes(cleaned)) {
      setSkills((prev) => [...prev, cleaned]);
    }
    setSkillInput("");
  };

  const commitSkillEdit = (idx: number) => {
    const cleaned = editingSkillVal.trim();
    if (cleaned) {
      setSkills((prev) => prev.map((s, i) => (i === idx ? cleaned : s)));
    }
    setEditingSkillIdx(null);
    setEditingSkillVal("");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const mergedSkills = skillInput.trim()
        ? Array.from(new Set([...skills, skillInput.trim()]))
        : skills;
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          staffStatus,
          bio,
          freeTime,
          phone,
          skills: mergedSkills,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        setSkills(data.user.skills);
        setSkillInput("");
        toast("Profile, skills & status updated!");
      } else {
        toast(data.error || "Update failed", "error");
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          emailPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        setEmailPassword("");
        toast("Login email updated!");
      } else {
        toast(data.error || "Could not update email", "error");
      }
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast("New password and confirm password do not match.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: oldPassword,
          newPassword,
          confirmPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.user) {
        setUser(data.user);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast("Password updated successfully!");
      } else {
        toast(data.error || "Password update failed", "error");
      }
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Name, Status, Bio, Free Time & Editable Skills */}
      <form
        onSubmit={handleSaveProfile}
        className="royal-card rounded-2xl p-6 space-y-5"
      >
        <div className="flex items-center gap-2.5 border-b border-[var(--border-subtle)] pb-3">
          <User className="h-5 w-5 gold-accent" />
          <h3 className="text-base font-bold">
            Name, Status, Bio & Skills
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Current Status
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(
                ["working", "free", "offline", "active"] as StaffStatus[]
              ).map((st) => {
                const meta = STAFF_STATUS_META[st];
                const selected = staffStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStaffStatus(st)}
                    className={`rounded-xl py-2.5 px-2 text-xs font-bold flex items-center justify-center gap-1.5 ${
                      selected ? "royal-btn" : "royal-btn-outline"
                    }`}
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: selected ? "#fff" : meta.dotColor,
                      }}
                    />
                    <span>{lang === "ur" ? meta.urduLabel : meta.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Skills Add + Inline Edit + Remove */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-2">
            {t("skills")} (Click any skill to edit)
          </label>
          <div className="flex flex-wrap gap-2 mb-2.5">
            {skills.map((skill, idx) =>
              editingSkillIdx === idx ? (
                <div
                  key={`edit-${idx}`}
                  className="royal-elevated inline-flex items-center gap-1 rounded-lg px-2 py-1"
                >
                  <input
                    type="text"
                    autoFocus
                    value={editingSkillVal}
                    onChange={(e) => setEditingSkillVal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitSkillEdit(idx);
                      }
                    }}
                    className="bg-transparent text-xs outline-none w-28"
                  />
                  <button
                    type="button"
                    onClick={() => commitSkillEdit(idx)}
                    className="text-emerald-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <span
                  key={`${skill}-${idx}`}
                  className="royal-elevated inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSkillIdx(idx);
                      setEditingSkillVal(skill);
                    }}
                    className="hover:underline"
                  >
                    {skill}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSkills((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-rose-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add skill..."
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
              className="royal-input flex-1"
            />
            <button
              type="button"
              onClick={addSkill}
              className="royal-btn-outline rounded-xl px-4 py-2 text-xs inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              {t("freeTime")}
            </label>
            <input
              type="text"
              placeholder="e.g. 2:00 PM – 6:00 PM"
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
            placeholder="Your bio..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="royal-input w-full"
          />
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="royal-btn rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          <span>{savingProfile ? "Saving..." : t("save")}</span>
        </button>
      </form>

      {/* 2. Change Login Email (Protected by Password) + 3. Change Password (Old + 2x New) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleUpdateEmail}
          className="royal-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <Mail className="h-4 w-4 gold-accent" />
            <h3 className="text-base font-bold">Change Email</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              New Email Address *
            </label>
            <input
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Current Password *
            </label>
            <input
              type="password"
              required
              placeholder="Confirm with your password"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={savingEmail}
            className="royal-btn rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingEmail ? "Updating..." : "Update Email"}</span>
          </button>
        </form>

        <form
          onSubmit={handleUpdatePassword}
          className="royal-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
            <KeyRound className="h-4 w-4 gold-accent" />
            <h3 className="text-base font-bold">Change Password</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Old Password *
            </label>
            <input
              type="password"
              required
              placeholder="Current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Confirm New Password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            className="royal-btn rounded-xl px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            <span>{savingPassword ? "Updating..." : "Update Password"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
