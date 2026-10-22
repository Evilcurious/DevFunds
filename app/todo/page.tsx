"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ExternalLink,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { TaskModal } from "@/components/modals/task-modal";
import type { StaffStatus, TaskRecord, UserRecord } from "@/lib/types";

export default function TodoChannelPage() {
  const { user, refreshSession, t, toast } = useApp();
  const [channel, setChannel] = useState<"bd" | "it">("bd");
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [staffList, setStaffList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Inline "Submit Work to CEO" state
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [afterSubmitStatus, setAfterSubmitStatus] =
    useState<StaffStatus>("free");

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks ?? []);
        setStaffList(json.staff ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (user?.portalRole === "it_ceo") setChannel("it");
    if (user?.portalRole === "bd_ceo") setChannel("bd");
    if (user?.portalRole === "staff" && user.sectionSlug === "it") {
      setChannel("it");
    }
  }, [user]);

  const canAssignInChannel =
    user?.portalRole === "erp_owner" ||
    (user?.portalRole === "bd_ceo" && channel === "bd") ||
    (user?.portalRole === "it_ceo" && channel === "it");

  // Team member selects a task -> automatically sets their status to "Working"!
  const handleSelectTask = async (task: TaskRecord) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "working" }),
    });
    if (res.ok) {
      await refreshSession();
      toast("Task selected — your status is now Working!");
      loadTasks();
    }
  };

  // Team member submits work to CEO -> notifies CEO + sets member status (Free / Offline / Working)
  const handleSubmitWorkToCeo = async (task: TaskRecord) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "submitted",
        submissionLink,
        completionNote,
        nextStaffStatus: afterSubmitStatus,
      }),
    });
    if (res.ok) {
      setSubmittingTaskId(null);
      setSubmissionLink("");
      setCompletionNote("");
      await refreshSession();
      toast("Work submitted to CEO!");
      loadTasks();
    }
  };

  // CEO approves work + optionally updates member's status directly!
  const handleCeoReviewTask = async (
    task: TaskRecord,
    nextStaffStatus?: StaffStatus
  ) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        ...(nextStaffStatus ? { nextStaffStatus } : {}),
      }),
    });
    if (res.ok) {
      toast("Work approved & status updated!");
      loadTasks();
    }
  };

  const handleDeleteTask = async (task: TaskRecord) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Deleted");
      loadTasks();
    }
  };

  const visibleTasks = tasks.filter((x) => x.sectionSlug === channel);
  const bdCount = tasks.filter((x) => x.sectionSlug === "bd").length;
  const itCount = tasks.filter((x) => x.sectionSlug === "it").length;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t("todo")}
          </h1>
          <div className="gold-line w-24" />
        </div>

        {canAssignInChannel && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="royal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{t("assignWork")}</span>
          </button>
        )}
      </div>

      {/* 2 Sections: BD Todo & IT Todo */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setChannel("bd")}
          style={
            channel === "bd"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-5 text-start transition-all"
        >
          <div className="text-xs font-bold uppercase tracking-widest gold-accent">
            1 · {t("bdTodo")}
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{bdCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setChannel("it")}
          style={
            channel === "it"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-5 text-start transition-all"
        >
          <div className="text-xs font-bold uppercase tracking-widest gold-accent">
            2 · {t("itTodo")}
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{itCount}</div>
        </button>
      </div>

      {/* Tasks Stream */}
      {loading ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          ...
        </div>
      ) : visibleTasks.length === 0 ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          {t("noRecords")}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleTasks.map((task) => {
            const isAssignee = user?.id === task.assignedToId;

            return (
              <div
                key={task.id}
                className="royal-card rounded-2xl p-5 space-y-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          task.priority === "urgent"
                            ? "bg-rose-500/20 text-rose-400"
                            : task.priority === "high"
                            ? "bg-amber-500/20 text-amber-300"
                            : "border border-[var(--border-subtle)] text-muted-royal"
                        }`}
                      >
                        {task.priority}
                      </span>
                      <Link
                        href={`/staff/${task.assignedToId}`}
                        className="text-xs gold-accent font-bold hover:underline"
                      >
                        → {task.assignedToName}
                      </Link>
                      {task.dueDate && (
                        <span className="text-xs text-muted-royal tabular-nums">
                          · {task.dueDate}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold">{task.title}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                      task.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : task.status === "submitted"
                        ? "bg-sky-500/15 text-sky-300"
                        : task.status === "working"
                        ? "bg-amber-500/15 text-amber-300"
                        : "royal-elevated text-muted-royal"
                    }`}
                  >
                    {task.status === "completed" && (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {task.status}
                  </span>
                </div>

                {task.description && (
                  <p className="royal-elevated rounded-xl px-4 py-3 text-sm text-muted-royal whitespace-pre-line">
                    {task.description}
                  </p>
                )}

                {(task.submissionLink || task.completionNote) && (
                  <div className="royal-elevated rounded-xl p-3.5 space-y-1 text-xs">
                    {task.completionNote && (
                      <p className="font-medium">{task.completionNote}</p>
                    )}
                    {task.submissionLink && (
                      <a
                        href={task.submissionLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 gold-accent hover:underline font-bold"
                      >
                        <span>Submitted Work: {task.submissionLink}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}

                {/* Inline Submit Work Form when clicked by Assignee */}
                {isAssignee && submittingTaskId === task.id && (
                  <div className="royal-elevated rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Work Link (https://...)"
                        value={submissionLink}
                        onChange={(e) => setSubmissionLink(e.target.value)}
                        className="royal-input w-full text-xs"
                      />
                      <select
                        value={afterSubmitStatus}
                        onChange={(e) =>
                          setAfterSubmitStatus(e.target.value as StaffStatus)
                        }
                        className="royal-input w-full text-xs"
                      >
                        <option value="free">My Status After Submit: Free</option>
                        <option value="offline">
                          My Status After Submit: Offline
                        </option>
                        <option value="working">
                          My Status After Submit: Working
                        </option>
                      </select>
                    </div>
                    <input
                      type="text"
                      placeholder="Summary note for CEO..."
                      value={completionNote}
                      onChange={(e) => setCompletionNote(e.target.value)}
                      className="royal-input w-full text-xs"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSubmittingTaskId(null)}
                        className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs"
                      >
                        {t("cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitWorkToCeo(task)}
                        className="royal-btn rounded-lg px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{t("submitWork")}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-xs text-muted-royal">
                  <div className="flex items-center gap-3">
                    <span>{task.assignedByName}</span>
                    {task.referenceLink && (
                      <a
                        href={task.referenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 gold-accent hover:underline"
                      >
                        <span>Reference</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {isAssignee && task.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => handleSelectTask(task)}
                        className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <Play className="h-3 w-3" />
                        <span>{t("selectTask")}</span>
                      </button>
                    )}

                    {isAssignee &&
                      task.status === "working" &&
                      submittingTaskId !== task.id && (
                        <button
                          type="button"
                          onClick={() => setSubmittingTaskId(task.id)}
                          className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                        >
                          <Send className="h-3 w-3" />
                          <span>{t("submitWork")}</span>
                        </button>
                      )}

                    {canAssignInChannel && task.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => handleCeoReviewTask(task, "free")}
                        className="royal-btn rounded-lg px-3 py-1.5 text-xs"
                      >
                        {t("approveWork")} & Set Free
                      </button>
                    )}

                    {canAssignInChannel && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task)}
                        className="royal-btn-outline rounded-lg p-1.5 text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {user && canAssignInChannel && (
        <TaskModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            toast("Work assigned & notification sent!");
            loadTasks();
          }}
          actorRole={user.portalRole}
          defaultSection={channel}
          staffList={staffList}
        />
      )}
    </div>
  );
}
