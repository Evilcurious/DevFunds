"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { useApp } from "@/components/app-context";
import { TaskModal } from "@/components/modals/task-modal";
import type { TaskRecord, TaskStatus, UserRecord } from "@/lib/types";

export default function TodoChannelPage() {
  const { user, t, toast } = useApp();
  const [channel, setChannel] = useState<"bd" | "it">("bd");
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [staffList, setStaffList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

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
  }, [user]);

  const canAssignInChannel =
    user?.portalRole === "erp_owner" ||
    (user?.portalRole === "bd_ceo" && channel === "bd") ||
    (user?.portalRole === "it_ceo" && channel === "it");

  const handleStatusChange = async (task: TaskRecord, status: TaskStatus) => {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast("Updated");
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
            const canModify =
              canAssignInChannel || user?.id === task.assignedToId;

            return (
              <div
                key={task.id}
                className="royal-card rounded-2xl p-5 space-y-3"
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
                      <span className="text-xs gold-accent font-semibold">
                        → {task.assignedToName}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-muted-royal tabular-nums">
                          · Due {task.dueDate}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold">{task.title}</h3>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${
                      task.status === "completed"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : task.status === "in_progress"
                        ? "bg-sky-500/15 text-sky-300"
                        : "royal-elevated text-muted-royal"
                    }`}
                  >
                    {task.status === "completed" && (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    )}
                    {task.status === "completed"
                      ? t("completed")
                      : task.status === "in_progress"
                      ? t("inProgress")
                      : t("pending")}
                  </span>
                </div>

                {task.description && (
                  <p className="royal-elevated rounded-xl px-4 py-3 text-sm text-muted-royal whitespace-pre-line">
                    {task.description}
                  </p>
                )}

                {task.completionNote && (
                  <div className="text-xs text-emerald-400">
                    ✓ {task.completionNote}
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
                        <span>Link</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  {canModify && (
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          ["pending", t("pending")],
                          ["in_progress", t("inProgress")],
                          ["completed", t("completed")],
                        ] as Array<[TaskStatus, string]>
                      ).map(([st, label]) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleStatusChange(task, st)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            task.status === st
                              ? "royal-btn"
                              : "royal-btn-outline"
                          }`}
                        >
                          {label}
                        </button>
                      ))}

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
                  )}
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
