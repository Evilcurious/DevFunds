"use client";

import React, { useEffect, useState } from "react";
import { Split, X } from "lucide-react";
import type { SectionRecord, UserRecord } from "@/lib/types";

export function SectionModal({
  open,
  mode,
  onClose,
  onSaved,
  sections,
  staffList,
}: {
  open: boolean;
  mode: "create" | "divide";
  onClose: () => void;
  onSaved: () => void;
  sections: SectionRecord[];
  staffList: UserRecord[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetSlug, setTargetSlug] = useState("");
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setTargetSlug(sections[0]?.slug || "bd");
    setSelectedStaffIds([]);
    setError("");
  }, [open, sections]);

  if (!open) return null;

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload =
        mode === "divide"
          ? {
              action: "divide",
              targetSlug,
              staffIds: selectedStaffIds,
            }
          : {
              action: "create",
              name,
              description,
              staffIds: selectedStaffIds,
            };

      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Action failed.");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111C35] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-blue-600 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <Split className="h-5 w-5" />
            <div>
              <h2 className="text-lg font-bold">
                {mode === "create"
                  ? "Add New Staff Section"
                  : "Divide / Move Staff Across Sections"}
              </h2>
              <p className="text-xs text-blue-100">
                {mode === "create"
                  ? "Create a new department alongside BD & IT and optionally move staff into it"
                  : "Select staff members and assign them to any section"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-blue-700"
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

          {mode === "create" ? (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  New Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Design, QA, Marketing, Support"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Section Description
                </label>
                <input
                  type="text"
                  placeholder="What does this section focus on?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                Destination Section *
              </label>
              <select
                value={targetSlug}
                onChange={(e) => setTargetSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white focus:border-blue-500 focus:outline-none"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name} ({s.staffCount ?? 0} staff)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
              {mode === "create"
                ? "Divide Existing Staff Into New Section (Optional)"
                : "Select Staff Members to Move *"}
            </label>
            {staffList.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                No staff accounts added yet. You can add staff members anytime after creating sections.
              </p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 bg-slate-50/70 dark:bg-slate-900/60">
                {staffList.map((member) => {
                  const checked = selectedStaffIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                        checked
                          ? "bg-blue-600 text-white"
                          : "hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStaff(member.id)}
                          className="rounded border-slate-300"
                        />
                        <div className="truncate">
                          <span className="font-semibold">{member.name}</span>
                          <span
                            className={`ml-2 text-xs ${
                              checked
                                ? "text-blue-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {member.jobTitle}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-bold uppercase ${
                          checked
                            ? "bg-white/20 text-white"
                            : "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {member.sectionName || member.sectionSlug || "Unassigned"}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
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
              className="rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-5 py-2.5 text-sm font-bold text-white shadow-sm"
            >
              {saving
                ? "Saving..."
                : mode === "create"
                ? "Create Section"
                : `Move ${selectedStaffIds.length || ""} Staff`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
