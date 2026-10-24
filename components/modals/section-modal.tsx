"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
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
          ? { action: "divide", targetSlug, staffIds: selectedStaffIds }
          : { action: "create", name, description, staffIds: selectedStaffIds };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <div className="royal-card w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-bold">
            {mode === "create" ? "Add Section" : "Divide Staff"}
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

          {mode === "create" ? (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                  Section Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Section name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="royal-input w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="royal-input w-full"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Destination Section *
              </label>
              <select
                value={targetSlug}
                onChange={(e) => setTargetSlug(e.target.value)}
                className="royal-input w-full"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.slug}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {staffList.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Select Staff
              </label>
              <div className="royal-elevated max-h-52 overflow-y-auto space-y-1.5 rounded-xl p-2.5">
                {staffList.map((member) => {
                  const checked = selectedStaffIds.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      style={
                        checked
                          ? {
                              backgroundColor: "var(--accent-primary)",
                              color: "#ffffff",
                            }
                          : undefined
                      }
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStaff(member.id)}
                        />
                        <span className="font-medium truncate">
                          {member.name}
                        </span>
                      </div>
                      <span className="text-xs uppercase opacity-75">
                        {member.sectionName || member.sectionSlug || "—"}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

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
