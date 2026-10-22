export type PortalRole = "erp_owner" | "it_ceo" | "bd_ceo" | "staff";

export type StaffStatus = "active" | "free" | "busy" | "not_available";

export type AttendanceStatus =
  | "present"
  | "late"
  | "half_day"
  | "on_leave"
  | "absent";

export type LeaveStatus = "pending" | "approved" | "rejected";

export type TaskPriority = "normal" | "high" | "urgent";

export type TaskStatus = "pending" | "in_progress" | "completed";

export type CurrencyCode = "PKR" | "USD" | "AED" | "GBP" | "EUR";

export type LanguageCode = "en" | "ur";

export type ThemePresetId =
  | "imperial_sapphire"
  | "ivory_sovereign"
  | "obsidian_gold"
  | "emerald_dynasty"
  | "burgundy_crown"
  | "pearl_platinum"
  | "amethyst_regency"
  | "custom";

export interface CustomThemePalette {
  bgCanvas: string;
  bgSurface: string;
  bgElevated: string;
  borderSubtle: string;
  accentPrimary: string;
  accentSecondary: string;
  textPrimary: string;
  textMuted: string;
}

export interface UploadedFont {
  id: string;
  name: string;
  dataUrl: string;
}

export interface AppSettings {
  companyName: string;
  logoUrl: string;
  currency: CurrencyCode;
  timezone: string;
  language: LanguageCode;
  themeId: ThemePresetId;
  customTheme: CustomThemePalette;
  textColorOverride: string;
  fontId: string;
  customFonts: UploadedFont[];
}

export interface SectionRecord {
  id: string;
  slug: string;
  name: string;
  description: string;
  color: string;
  isSystem: boolean;
  sortOrder: number;
  staffCount?: number;
  spendingTotal?: number;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  portalRole: PortalRole;
  jobTitle: string;
  sectionSlug: string | null;
  sectionName?: string | null;
  phone: string;
  location: string;
  skills: string[];
  bio: string;
  freeTime: string;
  staffStatus: StaffStatus;
  todayAttendanceStatus?: AttendanceStatus | null;
  todayCheckIn?: string | null;
  todayCheckOut?: string | null;
  joinedAt: string;
  updatedAt: string;
}

export interface SpendingRecord {
  id: string;
  sectionSlug: string;
  sectionName?: string;
  title: string;
  details: string;
  category: string;
  paymentMethod: string;
  referenceNote: string;
  amount: number;
  spentAt: string;
  createdById: string | null;
  createdByName: string;
  createdByRole: PortalRole;
  updatedAt: string;
}

export interface EarningRecord {
  id: string;
  customerName: string;
  customerCompany: string;
  customerContact: string;
  projectTitle: string;
  details: string;
  workLink: string;
  amountPaid: number;
  paymentMethod: string;
  departmentCredit: string;
  earnedAt: string;
  createdById: string | null;
  createdByName: string;
  createdByRole: PortalRole;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  jobTitle: string;
  sectionSlug: string | null;
  sectionName: string | null;
  staffStatus: StaffStatus;
  workDate: string;
  status: AttendanceStatus | "unmarked";
  checkIn: string | null;
  checkOut: string | null;
  note: string;
  markedByName: string | null;
  updatedAt: string | null;
}

export interface LeaveRequestRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  sectionSlug: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  reviewedByName: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface TaskRecord {
  id: string;
  sectionSlug: "bd" | "it";
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  referenceLink: string;
  completionNote: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string | null;
  assignedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRecord {
  id: string;
  recipientId: string;
  kind: string;
  title: string;
  body: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  summary: string;
  createdAt: string;
}

export interface OverviewResponse {
  settings: AppSettings;
  dbMode: "neon" | "postgres" | "local";
  metrics: {
    totalCustomers: number;
    totalEarning: number;
    totalSpending: number;
    bdSpending: number;
    itSpending: number;
    otherSpending: number;
    netProfit: number;
    profitMargin: number;
    totalStaff: number;
    activeStaff: number;
    freeStaff: number;
    busyStaff: number;
    unavailableStaff: number;
    todayDate: string;
    presentToday: number;
    lateToday: number;
    onLeaveToday: number;
    absentToday: number;
    unmarkedToday: number;
  };
  sections: SectionRecord[];
  recentSpending: SpendingRecord[];
  recentEarnings: EarningRecord[];
}
