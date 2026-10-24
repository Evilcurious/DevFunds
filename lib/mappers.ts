import { asJson, toIso, toNum } from "./db";
import type {
  AttendanceRecord,
  AttendanceStatus,
  AuditLogRecord,
  EarningRecord,
  LeaveRequestRecord,
  LeaveStatus,
  NotificationRecord,
  PortalRole,
  SectionRecord,
  SpendingRecord,
  StaffStatus,
  TaskAssigneeRecord,
  TaskPriority,
  TaskRecord,
  TaskStatus,
  UserRecord,
} from "./types";

function normalizeStaffStatus(raw: unknown): StaffStatus {
  const s = String(raw ?? "");
  if (s === "working" || s === "busy") return "working";
  if (s === "free") return "free";
  if (s === "offline" || s === "not_available") return "offline";
  return "active";
}

function normalizeTaskStatus(raw: unknown): TaskStatus {
  const s = String(raw ?? "");
  if (s === "working" || s === "in_progress") return "working";
  if (s === "submitted") return "submitted";
  if (s === "completed") return "completed";
  return "pending";
}

function computeAttendanceRate(row: Record<string, unknown>): {
  presentDays: number;
  totalDays: number;
  rate: number;
} {
  const presentDays = toNum(row.present_days_count, 0);
  const rawTracked = toNum(row.total_tracked_days, 0);

  // Elapsed days since joining (at least 1 day so marking day 1 immediately shows 100%)
  const joinedIso = toIso(row.joined_at);
  const joinedMs = new Date(joinedIso).getTime();
  const elapsedDays = Number.isFinite(joinedMs)
    ? Math.max(1, Math.floor((Date.now() - joinedMs) / 86_400_000) + 1)
    : 1;
  const leaveDays = toNum(row.leave_days_count, 0);
  const denominator = Math.max(
    presentDays,
    rawTracked,
    Math.max(1, elapsedDays - leaveDays)
  );
  const rate =
    presentDays <= 0
      ? 0
      : Math.min(100, Math.round((presentDays / denominator) * 100));

  return { presentDays, totalDays: denominator, rate };
}

export function mapSectionRow(row: Record<string, unknown>): SectionRecord {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description ?? ""),
    color: String(row.color ?? "blue"),
    isSystem: Boolean(row.is_system),
    sortOrder: toNum(row.sort_order, 10),
    staffCount:
      row.staff_count !== undefined ? toNum(row.staff_count, 0) : undefined,
    spendingTotal:
      row.spending_total !== undefined
        ? toNum(row.spending_total, 0)
        : undefined,
    createdAt: toIso(row.created_at),
  };
}

export function mapUserRow(row: Record<string, unknown>): UserRecord {
  const skillsRaw = asJson<unknown[]>(row.skills, []);
  const skills = Array.isArray(skillsRaw)
    ? skillsRaw.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const { presentDays, totalDays, rate } = computeAttendanceRate(row);

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    avatarUrl: String(row.avatar_url ?? ""),
    portalRole: String(row.portal_role) as PortalRole,
    jobTitle: String(row.job_title ?? ""),
    sectionSlug: row.section_slug ? String(row.section_slug) : null,
    sectionName: row.section_name ? String(row.section_name) : null,
    phone: String(row.phone ?? ""),
    location: String(row.location ?? ""),
    skills,
    bio: String(row.bio ?? ""),
    freeTime: String(row.free_time ?? ""),
    staffStatus: normalizeStaffStatus(row.staff_status),
    acceptedTasksCount: toNum(row.accepted_tasks_count, 0),
    completedTasksCount: toNum(row.completed_tasks_count, 0),
    presentDaysCount: presentDays,
    totalTrackedDays: totalDays,
    attendanceRate: rate,
    todayAttendanceStatus: row.today_attendance_status
      ? (String(row.today_attendance_status) as AttendanceStatus)
      : null,
    todayCheckIn: row.today_check_in ? toIso(row.today_check_in) : null,
    todayCheckOut: row.today_check_out ? toIso(row.today_check_out) : null,
    joinedAt: toIso(row.joined_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapSpendingRow(row: Record<string, unknown>): SpendingRecord {
  return {
    id: String(row.id),
    sectionSlug: String(row.section_slug),
    sectionName: row.section_name
      ? String(row.section_name)
      : String(row.section_slug).toUpperCase(),
    title: String(row.title),
    details: String(row.details ?? ""),
    category: String(row.category ?? "Other Expense"),
    paymentMethod: String(row.payment_method ?? "Bank Transfer"),
    referenceNote: String(row.reference_note ?? ""),
    amount: toNum(row.amount, 0),
    spentAt: toIso(row.spent_at),
    createdById: row.created_by_id ? String(row.created_by_id) : null,
    createdByName: String(row.created_by_name ?? "Admin"),
    createdByRole: (row.created_by_role as PortalRole) || "erp_owner",
    updatedAt: toIso(row.updated_at),
  };
}

export function mapEarningRow(row: Record<string, unknown>): EarningRecord {
  return {
    id: String(row.id),
    customerName: String(row.customer_name),
    customerCompany: String(row.customer_company ?? ""),
    customerContact: String(row.customer_contact ?? ""),
    projectTitle: String(row.project_title ?? ""),
    details: String(row.details ?? ""),
    workLink: String(row.work_link ?? ""),
    amountPaid: toNum(row.amount_paid, 0),
    paymentMethod: String(row.payment_method ?? "Bank Transfer"),
    departmentCredit: String(row.department_credit ?? "BD & IT"),
    earnedAt: toIso(row.earned_at),
    createdById: row.created_by_id ? String(row.created_by_id) : null,
    createdByName: String(row.created_by_name ?? "Admin"),
    createdByRole: (row.created_by_role as PortalRole) || "erp_owner",
    updatedAt: toIso(row.updated_at),
  };
}

export function mapAttendanceRow(
  row: Record<string, unknown>,
  workDate: string
): AttendanceRecord {
  const { presentDays, rate } = computeAttendanceRate(row);
  return {
    id: row.attendance_id ? String(row.attendance_id) : null,
    userId: String(row.user_id),
    userName: String(row.user_name),
    userEmail: String(row.user_email),
    avatarUrl: String(row.avatar_url ?? ""),
    portalRole: String(row.portal_role ?? "staff") as PortalRole,
    jobTitle: String(row.job_title ?? ""),
    sectionSlug: row.section_slug ? String(row.section_slug) : null,
    sectionName: row.section_name
      ? String(row.section_name)
      : row.section_slug
      ? String(row.section_slug).toUpperCase()
      : null,
    staffStatus: normalizeStaffStatus(row.staff_status),
    presentDaysCount: presentDays,
    attendanceRate: rate,
    workDate,
    status: row.attendance_status
      ? (String(row.attendance_status) as AttendanceStatus)
      : "unmarked",
    checkIn: row.check_in ? toIso(row.check_in) : null,
    checkOut: row.check_out ? toIso(row.check_out) : null,
    note: String(row.note ?? ""),
    markedById: row.marked_by_id ? String(row.marked_by_id) : null,
    markedByName: row.marked_by_name ? String(row.marked_by_name) : null,
    updatedAt: row.attendance_updated_at
      ? toIso(row.attendance_updated_at)
      : null,
  };
}

export function mapLeaveRow(row: Record<string, unknown>): LeaveRequestRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userEmail: row.user_email ? String(row.user_email) : undefined,
    sectionSlug: row.section_slug ? String(row.section_slug) : null,
    leaveType: String(row.leave_type ?? "Casual Leave"),
    startDate: String(row.start_date),
    endDate: String(row.end_date),
    reason: String(row.reason ?? ""),
    status: (row.status as LeaveStatus) || "pending",
    reviewedByName: row.reviewed_by_name ? String(row.reviewed_by_name) : null,
    reviewedAt: row.reviewed_at ? toIso(row.reviewed_at) : null,
    createdAt: toIso(row.created_at),
  };
}

export function mapTaskAssigneeRow(
  row: Record<string, unknown>
): TaskAssigneeRecord {
  return {
    userId: String(row.user_id),
    name: String(row.name ?? ""),
    avatarUrl: String(row.avatar_url ?? ""),
    jobTitle: String(row.job_title ?? ""),
    sectionSlug: row.section_slug ? String(row.section_slug) : null,
    status: normalizeTaskStatus(row.status),
    acceptedAt: row.accepted_at ? toIso(row.accepted_at) : null,
    submittedAt: row.submitted_at ? toIso(row.submitted_at) : null,
    submissionLink: String(row.submission_link ?? ""),
    completionNote: String(row.completion_note ?? ""),
    reviewedByName: String(row.reviewed_by_name ?? ""),
    updatedAt: toIso(row.updated_at),
  };
}

/** Roll a task's overall status up from every member assignment row. */
export function rollupTaskStatus(statuses: TaskStatus[]): TaskStatus {
  if (statuses.length === 0) return "pending";
  if (statuses.every((s) => s === "completed")) return "completed";
  if (statuses.some((s) => s === "submitted")) return "submitted";
  if (statuses.some((s) => s === "working")) return "working";
  return "pending";
}

export function mapTaskRow(
  row: Record<string, unknown>,
  assigneeRows: Record<string, unknown>[] = [],
  viewerId: string | null = null
): TaskRecord {
  const assignees = assigneeRows.map(mapTaskAssigneeRow);
  const myRow = viewerId ? assignees.find((a) => a.userId === viewerId) : null;

  const assigneeNames = assignees.map((a) => a.name).filter(Boolean);
  const legacyName = String(row.assigned_to_name ?? "");
  const displayNames =
    assigneeNames.length > 0
      ? assigneeNames.join(", ")
      : legacyName || "Unassigned";

  return {
    id: String(row.id),
    sectionSlug: String(row.section_slug) === "bd" ? "bd" : "it",
    title: String(row.title),
    description: String(row.description ?? ""),
    priority: (row.priority as TaskPriority) || "normal",
    status: rollupTaskStatus(assignees.map((a) => a.status)),
    dueDate: row.due_date ? String(row.due_date) : null,
    referenceLink: String(row.reference_link ?? ""),
    submissionLink: myRow
      ? myRow.submissionLink
      : assignees
          .map((a) => a.submissionLink)
          .filter(Boolean)
          .join(" , "),
    completionNote: myRow ? myRow.completionNote : "",
    acceptedAt: myRow ? myRow.acceptedAt : row.accepted_at ? toIso(row.accepted_at) : null,
    submittedAt: myRow
      ? myRow.submittedAt
      : row.submitted_at
      ? toIso(row.submitted_at)
      : null,
    assignedToId: assignees[0]?.userId ?? String(row.assigned_to_id ?? ""),
    assignedToName: displayNames,
    assignedById: row.assigned_by_id ? String(row.assigned_by_id) : null,
    assignedByName: String(row.assigned_by_name ?? "Admin"),
    assignees,
    completedCount: assignees.filter((a) => a.status === "completed").length,
    submittedCount: assignees.filter((a) => a.status === "submitted").length,
    viewerIsAssignee: Boolean(myRow),
    viewerStatus: myRow ? myRow.status : null,
    requestKind: row.request_kind === "cross" ? "cross" : "direct",
    requestStatus: (["pending", "accepted", "declined"].includes(
      String(row.request_status ?? "")
    )
      ? String(row.request_status)
      : "none") as TaskRecord["requestStatus"],
    originSection: String(row.origin_section ?? ""),
    requestedToRole: String(row.requested_to_role ?? ""),
    acceptedByName: String(row.accepted_by_name ?? ""),
    declineReason: String(row.decline_reason ?? ""),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

export function mapNotificationRow(
  row: Record<string, unknown>
): NotificationRecord {
  return {
    id: String(row.id),
    recipientId: String(row.recipient_id),
    kind: String(row.kind),
    title: String(row.title),
    body: String(row.body ?? ""),
    link: String(row.link ?? "/portals"),
    isRead: Boolean(row.is_read),
    createdAt: toIso(row.created_at),
  };
}

export function mapAuditRow(row: Record<string, unknown>): AuditLogRecord {
  return {
    id: String(row.id),
    actorId: row.actor_id ? String(row.actor_id) : null,
    actorName: String(row.actor_name),
    actorRole: String(row.actor_role),
    action: String(row.action),
    targetType: String(row.target_type),
    summary: String(row.summary),
    createdAt: toIso(row.created_at),
  };
}
