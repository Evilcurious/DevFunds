"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { PortalRole, TaskPriority, UserRecord } from "@/lib/types";

export function TaskModal({
  open,
  onClose,
  onSaved,
  actorRole,
  defaultSection,
  staffList,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  actorRole: PortalRole;
  defaultSection: "bd" | "it";
  staffList: UserRecord[];
}) {
  const lockedSection: "bd" | "it" | null =
    actorRole === "it_ceo" ? "it" : actorRole === "bd_ceo" ? "bd" : null;

  const [sectionSlug, setSectionSlug] = useState<"bd" | "it">(defaultSection);
  const [assignedToId, setAssignedToId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeSection = lockedSection || sectionSlug;
  const eligibleStaff = staffList.filter(
    (s) => s.sectionSlug === activeSection
  );

  useEffect(() => {
    if (!open) return;
    const sec = lockedSection || defaultSection;
    setSectionSlug(sec);
    const first = staffList.find((s) => s.sectionSlug === sec);
    setAssignedToId(first?.id || "");
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDueDate("");
    setReferenceLink("");
    setError("");
  }, [open, lockedSection, defaultSection, staffList]);

  useEffect(() => {
    if (!eligibleStaff.some((s) => s.id === assignedToId)) {
      setAssignedToId(eligibleStaff[0]?.id || "");
    }
  }, [activeSection, eligibleStaff, assignedToId]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionSlug: activeSection,
          assignedToId,
          title,
          description,
          priority,
          dueDate,
          referenceLink,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not assign task.");
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
          <h2 className="text-lg font-bold">Assign Work</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Channel
              </label>
              {lockedSection ? (
                <div className="royal-elevated rounded-xl px-3.5 py-2.5 text-sm font-bold uppercase">
                  {lockedSection} Todo
                </div>
              ) : (
                <select
                  value={sectionSlug}
                  onChange={(e) =>
                    setSectionSlug(e.target.value as "bd" | "it")
                  }
                  className="royal-input w-full"
                >
                  <option value="bd">BD Todo</option>
                  <option value="it">IT Todo</option>
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Assign To *
              </label>
              <select
                required
                value={assignedToId}
                onChange={(e) => setAssignedToId(e.target.value)}
                className="royal-input w-full"
              >
                {eligibleStaff.length === 0 ? (
                  <option value="">No staff in {activeSection.toUpperCase()}</option>
                ) : (
                  eligibleStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.jobTitle || "Staff"})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Work Title *
            </label>
            <input
              type="text"
              required
              placeholder="Task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Task instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="royal-input w-full"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="royal-input w-full"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="royal-input w-full"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Reference Link (Optional)
            </label>
            <input
              type="text"
              placeholder="https://..."
              value={referenceLink}
              onChange={(e) => setReferenceLink(e.target.value)}
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
              disabled={saving || eligibleStaff.length === 0}
              className="royal-btn rounded-xl px-5 py-2 text-sm disabled:opacity-60"
            >
              {saving ? "Assigning..." : "Assign Work"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
