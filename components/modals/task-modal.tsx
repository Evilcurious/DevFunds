"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Send, Users, X, Zap } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import type { PortalRole, TaskPriority, UserRecord } from "@/lib/types";

type TaskModalMode = "team" | "cross";

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
  onSaved: (message?: string) => void;
  actorRole: PortalRole;
  defaultSection: "bd" | "it";
  staffList: UserRecord[];
}) {
  const mySection: "bd" | "it" | null =
    actorRole === "it_ceo" ? "it" : actorRole === "bd_ceo" ? "bd" : null;
  const canCross = mySection !== null;
  const crossTargetSection: "bd" | "it" = mySection === "it" ? "bd" : "it";

  const [mode, setMode] = useState<TaskModalMode>("team");
  const [sectionSlug, setSectionSlug] = useState<"bd" | "it">(defaultSection);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const [dueDate, setDueDate] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const activeSection =
    mode === "cross"
      ? crossTargetSection
      : mySection || (sectionSlug === "bd" ? "bd" : "it");

  const eligibleStaff = useMemo(
    () => staffList.filter((s) => s.sectionSlug === activeSection),
    [staffList, activeSection]
  );

  useEffect(() => {
    if (!open) return;
    setMode("team");
    setSectionSlug(mySection || defaultSection);
    setSelectedIds([]);
    setTitle("");
    setDescription("");
    setPriority("normal");
    setDueDate("");
    setReferenceLink("");
    setError("");
  }, [open, mySection, defaultSection]);

  // Drop selections that no longer belong to the active department
  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => eligibleStaff.some((s) => s.id === id))
    );
  }, [eligibleStaff]);

  if (!open) return null;

  const toggleMember = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "team" && selectedIds.length === 0) {
      setError("Select at least one team member — one work can be shared with many.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sectionSlug: activeSection,
          assigneeIds: mode === "team" ? selectedIds : [],
          title,
          description,
          priority,
          dueDate,
          referenceLink,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create this work item.");
        return;
      }
      onSaved(
        mode === "cross"
          ? `Request sent to ${crossTargetSection.toUpperCase()} CEO!`
          : `Work assigned to ${selectedIds.length} member${
              selectedIds.length > 1 ? "s" : ""
            }!`
      );
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <div className="royal-card w-full max-w-2xl max-h-[92vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <h2 className="text-lg font-bold">New Work Item</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Route selector: my team OR the other CEO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMode("team")}
              style={
                mode === "team"
                  ? { borderColor: "var(--accent-secondary)" }
                  : undefined
              }
              className="royal-elevated rounded-xl p-3.5 text-start transition-all"
            >
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <Users className="h-4 w-4" />
                {canCross
                  ? `${mySection?.toUpperCase()} Team`
                  : "My Team"}
              </span>
              <span className="mt-1 block text-[11px] text-muted-royal">
                Assign directly to one or many members of your department.
              </span>
            </button>

            <button
              type="button"
              onClick={() => canCross && setMode("cross")}
              disabled={!canCross}
              style={
                mode === "cross"
                  ? { borderColor: "var(--accent-secondary)" }
                  : undefined
              }
              className="royal-elevated rounded-xl p-3.5 text-start transition-all disabled:opacity-45"
            >
              <span className="flex items-center gap-2 text-sm font-extrabold">
                <Zap className="h-4 w-4" />
                {canCross
                  ? `Request ${crossTargetSection.toUpperCase()} CEO`
                  : "CEO-to-CEO request (CEOs only)"}
              </span>
              <span className="mt-1 block text-[11px] text-muted-royal">
                {canCross
                  ? `${crossTargetSection.toUpperCase()} CEO accepts it, then assigns their own team.`
                  : "Only the IT CEO and BD CEO can request work from each other."}
              </span>
            </button>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-300">
              {error}
            </div>
          )}

          {mode === "team" && !mySection && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
                Todo Channel
              </label>
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
            </div>
          )}

          {mode === "team" && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
                  Assign To * ({eligibleStaff.length} in {activeSection.toUpperCase()})
                </label>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <span className="rounded-md border border-[var(--accent-secondary)] px-2 py-0.5 text-[10px] font-bold gold-accent">
                      {selectedIds.length} selected
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedIds(
                        selectedIds.length === eligibleStaff.length
                          ? []
                          : eligibleStaff.map((s) => s.id)
                      )
                    }
                    className="text-[11px] font-bold gold-accent hover:underline"
                  >
                    {selectedIds.length === eligibleStaff.length
                      ? "Clear all"
                      : "Select all"}
                  </button>
                </div>
              </div>

              {eligibleStaff.length === 0 ? (
                <div className="royal-elevated rounded-xl px-4 py-6 text-center text-xs text-muted-royal">
                  No team members in {activeSection.toUpperCase()} yet.
                </div>
              ) : (
                <div className="royal-elevated rounded-xl p-2 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {eligibleStaff.map((s) => {
                    const checked = selectedIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleMember(s.id)}
                        style={
                          checked
                            ? { borderColor: "rgba(52, 211, 153, 0.5)" }
                            : undefined
                        }
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-all ${
                          checked
                            ? "bg-emerald-500/15"
                            : "hover:bg-[var(--bg-canvas)]"
                        }`}
                      >
                        <UserAvatar
                          name={s.name}
                          avatarUrl={s.avatarUrl}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold">
                            {s.name}
                          </span>
                          <span className="block truncate text-[10px] text-muted-royal">
                            {s.jobTitle || "Team Member"}
                          </span>
                        </span>
                        {checked && (
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-royal mb-1.5">
              Work Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Prepare company profile deck"
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
              placeholder="What exactly has to be delivered..."
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

          {mode === "cross" && (
            <p className="royal-elevated rounded-xl px-4 py-3 text-xs text-muted-royal">
              This goes to the{" "}
              <b className="gold-accent">{crossTargetSection.toUpperCase()} CEO</b>{" "}
              as a request. They will accept it and then assign it to their own team
              members — you will be notified on acceptance and on delivery.
            </p>
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
              disabled={
                saving || (mode === "team" && eligibleStaff.length === 0)
              }
              className="royal-btn rounded-xl px-5 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              <span>
                {saving
                  ? "Saving..."
                  : mode === "cross"
                  ? `Send To ${crossTargetSection.toUpperCase()} CEO`
                  : selectedIds.length > 1
                  ? `Assign To ${selectedIds.length} Members`
                  : "Assign Work"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Small modal used to pick / re-pick the member roster of an existing task. */
export function TaskRosterModal({
  open,
  onClose,
  onSaved,
  staffList,
  mode = "assign",
  task,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (message?: string) => void;
  staffList: UserRecord[];
  mode?: "assign" | "accept";
  task: {
    id: string;
    title: string;
    sectionSlug: "bd" | "it";
    assigneeIds: string[];
  } | null;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const eligible = useMemo(
    () => staffList.filter((s) => s.sectionSlug === task?.sectionSlug),
    [staffList, task?.sectionSlug]
  );

  useEffect(() => {
    if (!open || !task) return;
    setSelectedIds(task.assigneeIds);
    setError("");
  }, [open, task]);

  if (!open || !task) return null;

  const toggle = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError("Select at least one team member for this work.");
      return;
    }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: mode === "accept" ? "accept_request" : "assign",
        assigneeIds: selectedIds,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Could not update the team.");
      return;
    }
    onSaved(
      mode === "accept"
        ? `Request accepted & assigned to ${selectedIds.length} member${
            selectedIds.length > 1 ? "s" : ""
          }!`
        : "Team roster updated!"
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <div className="royal-card w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold">
              {mode === "accept"
                ? `Accept Request · Assign ${task.sectionSlug.toUpperCase()} Team`
                : `Assign ${task.sectionSlug.toUpperCase()} Team Members`}
            </h2>
            <p className="text-xs text-muted-royal mt-0.5 truncate max-w-sm">
              {task.title}
            </p>
          </div>
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

          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-royal">
              {eligible.length} member{eligible.length === 1 ? "" : "s"} available ·{" "}
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  selectedIds.length === eligible.length ? [] : eligible.map((s) => s.id)
                )
              }
              className="text-[11px] font-bold gold-accent hover:underline"
            >
              {selectedIds.length === eligible.length && eligible.length > 0
                ? "Clear all"
                : "Select all"}
            </button>
          </div>

          {eligible.length === 0 ? (
            <div className="royal-elevated rounded-xl px-4 py-6 text-center text-xs text-muted-royal">
              No team members in {task.sectionSlug.toUpperCase()} yet.
            </div>
          ) : (
            <div className="royal-elevated rounded-xl p-2 max-h-72 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {eligible.map((s) => {
                const checked = selectedIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggle(s.id)}
                    style={
                      checked
                        ? { borderColor: "rgba(52, 211, 153, 0.5)" }
                        : undefined
                    }
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-start transition-all ${
                      checked ? "bg-emerald-500/15" : "hover:bg-[var(--bg-canvas)]"
                    }`}
                  >
                    <UserAvatar name={s.name} avatarUrl={s.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">
                        {s.name}
                      </span>
                      <span className="block truncate text-[10px] text-muted-royal">
                        {s.jobTitle || "Team Member"}
                      </span>
                    </span>
                    {checked && (
                      <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
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
              {saving
                ? "Saving..."
                : `${mode === "accept" ? "Accept & Assign" : "Assign"} ${
                    selectedIds.length
                  } Member${selectedIds.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
