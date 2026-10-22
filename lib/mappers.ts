import { asJson, toIso, toNum } from "./db";
import type {
  AttendanceRecord,
  AttendanceStatus,
  AuditLogRecord,
  EarningRecord,
  PortalRole,
  SectionRecord,
  SpendingRecord,
  StaffStatus,
  UserRecord,
} from "./types";

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

  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
    portalRole: String(row.portal_role) as PortalRole,
    jobTitle: String(row.job_title ?? ""),
    sectionSlug: row.section_slug ? String(row.section_slug) : null,
    sectionName: row.section_name ? String(row.section_name) : null,
    phone: String(row.phone ?? ""),
    location: String(row.location ?? ""),
    skills,
    bio: String(row.bio ?? ""),
    freeTime: String(row.free_time ?? ""),
    staffStatus: (row.staff_status as StaffStatus) || "active",
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
    category: String(row.category ?? "Other Operational Expense"),
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
  return {
    id: row.attendance_id ? String(row.attendance_id) : null,
    userId: String(row.user_id),
    userName: String(row.user_name),
    userEmail: String(row.user_email),
    jobTitle: String(row.job_title ?? ""),
    sectionSlug: row.section_slug ? String(row.section_slug) : null,
    sectionName: row.section_name
      ? String(row.section_name)
      : row.section_slug
      ? String(row.section_slug).toUpperCase()
      : null,
    staffStatus: (row.staff_status as StaffStatus) || "active",
    workDate,
    status: row.attendance_status
      ? (String(row.attendance_status) as AttendanceStatus)
      : "unmarked",
    checkIn: row.check_in ? toIso(row.check_in) : null,
    checkOut: row.check_out ? toIso(row.check_out) : null,
    note: String(row.note ?? ""),
    markedByName: row.marked_by_name ? String(row.marked_by_name) : null,
    updatedAt: row.attendance_updated_at
      ? toIso(row.attendance_updated_at)
      : null,
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
