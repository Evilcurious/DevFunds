"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Inbox,
  Play,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { useApp } from "@/components/app-context";
import { UserAvatar } from "@/components/user-avatar";
import { TaskModal, TaskRosterModal } from "@/components/modals/task-modal";
import type {
  StaffStatus,
  TaskAssigneeRecord,
  TaskRecord,
  UserRecord,
} from "@/lib/types";

const STATUS_TONE: Record<string, string> = {
  pending: "text-muted-royal",
  working: "text-amber-300",
  submitted: "text-sky-300",
  completed: "text-emerald-400",
};

export default function TodoChannelPage() {
  const { user, refreshSession, t, toast } = useApp();
  const [channel, setChannel] = useState<"bd" | "it">("bd");
  const [lane, setLane] = useState<"work" | "requests">("work");
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [staffList, setStaffList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [rosterTask, setRosterTask] = useState<TaskRecord | null>(null);
  const [rosterMode, setRosterMode] = useState<"assign" | "accept">(
    "assign"
  );

  // Inline "Submit my work to CEO" composer
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submissionLink, setSubmissionLink] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  const [afterSubmitStatus, setAfterSubmitStatus] =
    useState<StaffStatus>("free");

  // Inline "Decline request" composer
  const [decliningTaskId, setDecliningTaskId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const isManager =
    user?.portalRole === "erp_owner" ||
    user?.portalRole === "it_ceo" ||
    user?.portalRole === "bd_ceo";

  const myDept: "bd" | "it" | null =
    user?.portalRole === "it_ceo"
      ? "it"
      : user?.portalRole === "bd_ceo"
      ? "bd"
      : user?.portalRole === "staff"
      ? user.sectionSlug === "it"
        ? "it"
        : "bd"
      : null;

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const query =
        user?.portalRole === "it_ceo" || user?.portalRole === "bd_ceo"
          ? `?dept=${myDept}`
          : user?.portalRole === "staff"
          ? `?section=${myDept ?? "bd"}`
          : "";
      const res = await fetch(`/api/tasks${query}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setTasks(json.tasks ?? []);
        setStaffList(json.staff ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [myDept, user?.portalRole]);

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

  const openRoster = (task: TaskRecord, mode: "assign" | "accept") => {
    setRosterMode(mode);
    setRosterTask(task);
  };

  // ── Lanes ────────────────────────────────────────────────────────────────
  const receivedRequests = useMemo(
    () =>
      tasks.filter(
        (x) =>
          x.requestKind === "cross" &&
          (user?.portalRole === "erp_owner" || x.sectionSlug === myDept)
      ),
    [tasks, myDept, user?.portalRole]
  );

  const sentRequests = useMemo(
    () =>
      tasks.filter(
        (x) =>
          x.requestKind === "cross" &&
          (user?.portalRole === "erp_owner" || x.originSection === myDept)
      ),
    [tasks, myDept, user?.portalRole]
  );

  const pendingRequests = useMemo(
    () => receivedRequests.filter((x) => x.requestStatus === "pending"),
    [receivedRequests]
  );

  const laneTasks = useMemo(
    () =>
      tasks.filter(
        (x) =>
          x.sectionSlug === channel &&
          !(x.requestKind === "cross" && x.requestStatus === "pending")
      ),
    [tasks, channel]
  );

  const bdCount = tasks.filter(
    (x) => x.sectionSlug === "bd" && x.requestStatus !== "pending"
  ).length;
  const itCount = tasks.filter(
    (x) => x.sectionSlug === "it" && x.requestStatus !== "pending"
  ).length;

  // ── Actions ──────────────────────────────────────────────────────────────
  const patchTask = async (
    taskId: string,
    payload: Record<string, unknown>,
    successMessage: string
  ) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || "Could not update this work item.", "error");
      return false;
    }
    await refreshSession();
    toast(successMessage);
    loadTasks();
    return true;
  };

  const handleSelectTask = (task: TaskRecord) =>
    patchTask(task.id, { status: "working" }, "Task selected — your status is now Working!");

  const handleReleaseTask = (task: TaskRecord) =>
    patchTask(task.id, { status: "pending" }, "Work released — back to Pending.");

  const handleSubmitWorkToCeo = async (task: TaskRecord) => {
    const ok = await patchTask(
      task.id,
      {
        status: "submitted",
        submissionLink,
        completionNote,
        nextStaffStatus: afterSubmitStatus,
      },
      "Work submitted to CEO!"
    );
    if (ok) {
      setSubmittingTaskId(null);
      setSubmissionLink("");
      setCompletionNote("");
    }
  };

  const handleApprove = (task: TaskRecord, member?: TaskAssigneeRecord) =>
    patchTask(
      task.id,
      {
        status: "completed",
        ...(member ? { assigneeId: member.userId } : {}),
      },
      member ? `${member.name} — work approved!` : "All submitted work approved!"
    );

  const handleReturnWork = (task: TaskRecord, member: TaskAssigneeRecord) =>
    patchTask(
      task.id,
      { status: "pending", assigneeId: member.userId },
      `${member.name} — work returned for revisions.`
    );

  const handleDeclineRequest = async (task: TaskRecord) => {
    const ok = await patchTask(task.id, { action: "decline_request", declineReason }, "Request declined.");
    if (ok) {
      setDecliningTaskId(null);
      setDeclineReason("");
    }
  };

  const handleWithdrawRequest = async (task: TaskRecord) => {
    if (!window.confirm(`Withdraw request "${task.title}"?`)) return;
    await patchTask(task.id, { action: "withdraw" }, "Request withdrawn.");
  };

  const handleDeleteTask = async (task: TaskRecord) => {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) {
      toast("Deleted");
      loadTasks();
    }
  };

  // ── Render helpers ───────────────────────────────────────────────────────
  const assigneeChip = (task: TaskRecord, member: TaskAssigneeRecord) => {
    const isMe = member.userId === user?.id;
    const canReview =
      isManager &&
      task.requestStatus !== "pending" &&
      (user?.portalRole === "erp_owner" || myDept === task.sectionSlug);

    return (
      <div
        key={member.userId}
        style={
          member.status === "completed"
            ? { borderColor: "rgba(52, 211, 153, 0.45)" }
            : member.status === "submitted"
            ? { borderColor: "rgba(56, 189, 248, 0.45)" }
            : undefined
        }
        className={`royal-elevated rounded-xl px-3 py-2.5 flex items-center gap-2.5 transition-all ${
          isMe ? "ring-1 ring-[var(--accent-secondary)]" : ""
        }`}
      >
        <Link
          href={`/staff/${member.userId}`}
          className="flex items-center gap-2.5 min-w-0 group"
        >
          <UserAvatar
            name={member.name}
            avatarUrl={member.avatarUrl}
            size="sm"
            glowing={member.status === "completed" || member.status === "working"}
          />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span
                className={`text-xs font-extrabold truncate group-hover:underline ${
                  member.status === "completed" ? "attendance-glow-name" : ""
                }`}
              >
                {member.name}
              </span>
              {isMe && (
                <span className="rounded border border-[var(--accent-secondary)] px-1 text-[9px] font-black uppercase gold-accent">
                  {t("you")}
                </span>
              )}
            </span>
            <span
              className={`block text-[10px] font-bold uppercase tracking-wide ${
                STATUS_TONE[member.status]
              }`}
            >
              {t(member.status)}
            </span>
          </span>
        </Link>

        {member.submissionLink && (
          <a
            href={member.submissionLink}
            target="_blank"
            rel="noopener noreferrer"
            title={member.submissionLink}
            className="ms-auto inline-flex items-center gap-1 text-[10px] font-bold gold-accent hover:underline shrink-0"
          >
            <span>Work</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {canReview && member.status !== "pending" && (
          <span className="ms-auto flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => handleApprove(task, member)}
              className="royal-btn rounded-lg px-2 py-1 text-[10px] font-bold"
            >
              {t("approveMember")}
            </button>
            <button
              type="button"
              title={t("returnMember")}
              onClick={() => handleReturnWork(task, member)}
              className="royal-btn-outline rounded-lg p-1 text-rose-400"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </span>
        )}
      </div>
    );
  };

  const taskCard = (task: TaskRecord) => {
    const isMeAssignee = task.viewerIsAssignee;
    const myStatus = task.viewerStatus;
    const isCross = task.requestKind === "cross";
    const isPendingRequest = isCross && task.requestStatus === "pending";
    const canExecute =
      isManager &&
      (user?.portalRole === "erp_owner" || myDept === task.sectionSlug);
    const total = task.assignees.length;
    const pct = total > 0 ? Math.round((task.completedCount / total) * 100) : 0;

    return (
      <div
        style={
          task.status === "completed" && total > 0
            ? { borderColor: "rgba(52, 211, 153, 0.4)" }
            : isPendingRequest
            ? { borderColor: "rgba(251, 191, 36, 0.5)" }
            : undefined
        }
        className="royal-card rounded-2xl p-5 space-y-3.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
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
              {isCross && (
                <span className="inline-flex items-center gap-1 rounded-md border border-[var(--accent-secondary)] px-2 py-0.5 text-[10px] font-black uppercase gold-accent">
                  <ArrowLeftRight className="h-3 w-3" />
                  {task.originSection.toUpperCase()} → {task.sectionSlug.toUpperCase()}
                </span>
              )}
              {task.dueDate && (
                <span className="text-xs text-muted-royal tabular-nums">
                  · Due {task.dueDate}
                </span>
              )}
            </div>
            <h3 className="text-base font-bold leading-snug">{task.title}</h3>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {isPendingRequest ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold uppercase text-amber-300">
                {t("awaitingCeo")}
              </span>
            ) : task.requestStatus === "declined" ? (
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold uppercase text-rose-300">
                {t("rejected")}
              </span>
            ) : (
              <span
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase ${
                  STATUS_TONE[task.status]
                } royal-elevated`}
              >
                {task.status === "completed" && (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                {t(task.status)}
                {total > 1 ? ` · ${task.completedCount}/${total}` : ""}
              </span>
            )}
            {total > 1 && (
              <span className="w-24 h-1 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                <span
                  style={{ width: `${pct}%` }}
                  className="block h-full rounded-full bg-emerald-400/80"
                />
              </span>
            )}
          </div>
        </div>

        {task.description && (
          <p className="royal-elevated rounded-xl px-4 py-3 text-sm text-muted-royal whitespace-pre-line">
            {task.description}
          </p>
        )}

        {/* ROSTER — one work item shared with one or many team members */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-royal">
              {total > 0
                ? `${t("sharedWith")} · ${total}`
                : t("noAssignees")}
            </span>
            {canExecute && total > 0 && !isPendingRequest && (
              <button
                type="button"
                onClick={() => openRoster(task, "assign")}
                className="inline-flex items-center gap-1 text-[10px] font-bold gold-accent hover:underline"
              >
                <UserPlus className="h-3 w-3" />
                <span>{t("reassignTeam")}</span>
              </button>
            )}
          </div>
          {total > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {task.assignees.map((m) => assigneeChip(task, m))}
            </div>
          )}
        </div>

        {isMeAssignee && task.completionNote && (
          <p className="rounded-xl bg-sky-500/10 px-4 py-2.5 text-xs text-sky-200">
            Your note: {task.completionNote}
          </p>
        )}

        {task.declineReason && (
          <p className="rounded-xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {task.declineReason}
          </p>
        )}

        {isCross && task.acceptedByName && task.requestStatus === "accepted" && (
          <p className="text-[11px] text-muted-royal">
            {t("acceptedBy")} {task.acceptedByName}
          </p>
        )}

        {/* Member's own submit composer */}
        {isMeAssignee && submittingTaskId === task.id && (
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
                <option value="offline">My Status After Submit: Offline</option>
                <option value="working">My Status After Submit: Working</option>
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

        {/* Decline composer */}
        {decliningTaskId === task.id && (
          <div className="royal-elevated rounded-xl p-4 space-y-3">
            <input
              type="text"
              placeholder="Reason for declining (visible to the other CEO)..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="royal-input w-full text-xs"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecliningTaskId(null)}
                className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={() => handleDeclineRequest(task)}
                className="royal-btn rounded-lg px-4 py-1.5 text-xs"
              >
                {t("declineRequest")}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-[var(--border-subtle)] text-xs text-muted-royal">
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              {isCross
                ? `${t("requestedBy")} ${task.assignedByName}`
                : `${task.assignedByName} · ${t("assignWork")}`}
            </span>
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
            {isPendingRequest && canExecute && (
              <>
                <button
                  type="button"
                  onClick={() => openRoster(task, "accept")}
                  className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{t("acceptRequest")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecliningTaskId(task.id)}
                  className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs text-rose-400 inline-flex items-center gap-1"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>{t("declineRequest")}</span>
                </button>
              </>
            )}

            {isPendingRequest && !canExecute && user?.portalRole !== "staff" && (
              <button
                type="button"
                onClick={() => handleWithdrawRequest(task)}
                className="royal-btn-outline rounded-lg px-3 py-1.5 text-xs text-rose-400"
              >
                {t("withdrawRequest")}
              </button>
            )}

            {isMeAssignee && myStatus === "pending" && (
              <button
                type="button"
                onClick={() => handleSelectTask(task)}
                className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                <Play className="h-3 w-3" />
                <span>{t("selectTask")}</span>
              </button>
            )}
            {isMeAssignee && myStatus === "working" && submittingTaskId !== task.id && (
              <button
                type="button"
                onClick={() => setSubmittingTaskId(task.id)}
                className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                <Send className="h-3 w-3" />
                <span>{t("submitWork")}</span>
              </button>
            )}
            {isMeAssignee && myStatus === "working" && (
              <button
                type="button"
                onClick={() => handleReleaseTask(task)}
                className="royal-btn-outline rounded-lg px-2.5 py-1.5 text-xs"
                title="Release this work"
              >
                {t("returnMember")}
              </button>
            )}

            {canExecute && total === 0 && !isPendingRequest && (
              <button
                type="button"
                onClick={() => openRoster(task, "assign")}
                className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>{t("assignMyTeam")}</span>
              </button>
            )}

            {canExecute &&
              !isPendingRequest &&
              task.assignees.some((m) => m.status === "submitted") && (
                <button
                  type="button"
                  onClick={() => handleApprove(task)}
                  className="royal-btn rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{t("approveAll")}</span>
                </button>
              )}

            {isManager && canExecute && (
              <button
                type="button"
                onClick={() => handleDeleteTask(task)}
                className="royal-btn-outline rounded-lg p-1.5 text-rose-400"
                title={t("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("todo")}
            </h1>
            {pendingRequests.length > 0 && (
              <button
                type="button"
                onClick={() => setLane("requests")}
                className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-2.5 py-1 text-[11px] font-black uppercase text-amber-300"
              >
                {pendingRequests.length} {t("requestsReceived")}
              </button>
            )}
          </div>
          <div className="gold-line w-24" />
        </div>

        {isManager && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLane(lane === "requests" ? "work" : "requests")}
              className="royal-btn-outline inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>{t("ceoRequests")}</span>
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="royal-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>{t("assignWork")}</span>
            </button>
          </div>
        )}
      </div>

      {/* 1 · BD Todo | 2 · IT Todo | 3 · Requests Received | 4 · Requests Sent */}
      <div
        className={`grid gap-4 ${
          isManager ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2"
        }`}
      >
        <button
          type="button"
          onClick={() => {
            setLane("work");
            setChannel("bd");
          }}
          style={
            lane === "work" && channel === "bd"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-4 text-start transition-all"
        >
          <div className="text-[11px] font-bold uppercase tracking-widest gold-accent">
            1 · {t("bdTodo")}
          </div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums">{bdCount}</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setLane("work");
            setChannel("it");
          }}
          style={
            lane === "work" && channel === "it"
              ? { borderColor: "var(--accent-secondary)" }
              : undefined
          }
          className="royal-card rounded-2xl p-4 text-start transition-all"
        >
          <div className="text-[11px] font-bold uppercase tracking-widest gold-accent">
            2 · {t("itTodo")}
          </div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums">{itCount}</div>
        </button>

        {isManager && (
          <>
            <button
              type="button"
              onClick={() => setLane("requests")}
              style={
                lane === "requests"
                  ? { borderColor: "var(--accent-secondary)" }
                  : undefined
              }
              className="royal-card rounded-2xl p-4 text-start transition-all"
            >
              <div className="text-[11px] font-bold uppercase tracking-widest gold-accent">
                3 · {t("requestsReceived")}
              </div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums">
                {receivedRequests.length}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setLane("requests")}
              style={
                lane === "requests"
                  ? { borderColor: "var(--accent-secondary)" }
                  : undefined
              }
              className="royal-card rounded-2xl p-4 text-start transition-all"
            >
              <div className="text-[11px] font-bold uppercase tracking-widest gold-accent">
                4 · {t("requestsSent")}
              </div>
              <div className="mt-1.5 text-2xl font-bold tabular-nums">
                {sentRequests.length}
              </div>
            </button>
          </>
        )}
      </div>

      {loading ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          ...
        </div>
      ) : lane === "requests" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-widest gold-accent flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              {t("requestsReceived")}
            </h2>
            {receivedRequests.length === 0 ? (
              <p className="royal-card rounded-2xl p-8 text-center text-xs text-muted-royal">
                {t("noRequests")}
              </p>
            ) : (
              receivedRequests.map((tk) => taskCard(tk))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-black uppercase tracking-widest gold-accent">
              <Send className="inline h-4 w-4 -mt-0.5" /> {t("requestsSent")}
            </h2>
            {sentRequests.length === 0 ? (
              <p className="royal-card rounded-2xl p-8 text-center text-xs text-muted-royal">
                {t("noRequests")}
              </p>
            ) : (
              sentRequests.map((tk) => taskCard(tk))
            )}
            {user && user.portalRole !== "erp_owner" && (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="royal-btn-outline w-full rounded-2xl py-3 text-xs font-bold inline-flex items-center justify-center gap-2"
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>{t("requestWork")}</span>
              </button>
            )}
          </section>
        </div>
      ) : laneTasks.length === 0 ? (
        <div className="royal-card rounded-2xl p-12 text-center text-xs text-muted-royal">
          {t("noRecords")}
        </div>
      ) : (
        <div className="space-y-4">{laneTasks.map((tk) => taskCard(tk))}</div>
      )}

      {user && isManager && (
        <TaskModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSaved={(message) => {
            toast(message || "Saved!");
            loadTasks();
          }}
          actorRole={user.portalRole}
          defaultSection={channel}
          staffList={staffList}
        />
      )}

      <TaskRosterModal
        open={rosterTask !== null}
        onClose={() => setRosterTask(null)}
        mode={rosterMode}
        staffList={
          rosterTask
            ? staffList.filter((s) => s.sectionSlug === rosterTask.sectionSlug)
            : staffList
        }
        task={
          rosterTask
            ? {
                id: rosterTask.id,
                title: rosterTask.title,
                sectionSlug: rosterTask.sectionSlug,
                assigneeIds: rosterTask.assignees.map((a) => a.userId),
              }
            : null
        }
        onSaved={(message) => {
          toast(message || "Saved!");
          setLane("work");
          loadTasks();
        }}
      />
    </div>
  );
}
