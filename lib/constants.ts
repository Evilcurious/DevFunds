import { ROYAL_THEMES } from "./themes";
import type {
  AppSettings,
  AttendanceStatus,
  CurrencyCode,
  PortalRole,
  StaffStatus,
} from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "DevFunds",
  logoUrl: "",
  currency: "PKR",
  timezone: "Asia/Karachi",
  language: "en",
  themeId: "imperial_sapphire",
  customTheme: ROYAL_THEMES[0].palette,
  textColorOverride: "",
  fontId: "plus_jakarta",
  customFonts: [],
};

export const CURRENCIES: Record<
  CurrencyCode,
  { code: CurrencyCode; symbol: string; label: string }
> = {
  PKR: { code: "PKR", symbol: "Rs.", label: "PKR (Rs.)" },
  USD: { code: "USD", symbol: "$", label: "USD ($)" },
  AED: { code: "AED", symbol: "AED", label: "AED" },
  GBP: { code: "GBP", symbol: "£", label: "GBP (£)" },
  EUR: { code: "EUR", symbol: "€", label: "EUR (€)" },
};

export const PORTAL_META: Record<
  PortalRole,
  {
    role: PortalRole;
    title: string;
    urduTitle: string;
    shortTitle: string;
    defaultSection: string | null;
  }
> = {
  erp_owner: {
    role: "erp_owner",
    title: "ERP Owner",
    urduTitle: "ای آر پی اونر",
    shortTitle: "ERP Owner",
    defaultSection: null,
  },
  it_ceo: {
    role: "it_ceo",
    title: "IT CEO",
    urduTitle: "آئی ٹی سی ای او",
    shortTitle: "IT CEO",
    defaultSection: "it",
  },
  bd_ceo: {
    role: "bd_ceo",
    title: "BD CEO",
    urduTitle: "بی ڈی سی ای او",
    shortTitle: "BD CEO",
    defaultSection: "bd",
  },
  staff: {
    role: "staff",
    title: "Staff",
    urduTitle: "اسٹاف",
    shortTitle: "Staff",
    defaultSection: null,
  },
};

export const STAFF_STATUS_META: Record<
  StaffStatus,
  {
    value: StaffStatus;
    label: string;
    urduLabel: string;
    dotColor: string;
  }
> = {
  active: {
    value: "active",
    label: "Active",
    urduLabel: "فعال",
    dotColor: "#10B981",
  },
  free: {
    value: "free",
    label: "Free",
    urduLabel: "فارغ",
    dotColor: "#38BDF8",
  },
  busy: {
    value: "busy",
    label: "Busy",
    urduLabel: "مصروف",
    dotColor: "#F59E0B",
  },
  not_available: {
    value: "not_available",
    label: "Not Available",
    urduLabel: "غیر دستیاب",
    dotColor: "#EF4444",
  },
};

export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus | "unmarked",
  {
    label: string;
    urduLabel: string;
    color: string;
  }
> = {
  present: { label: "Present", urduLabel: "حاضر", color: "#10B981" },
  late: { label: "Late", urduLabel: "تاخیر", color: "#F59E0B" },
  half_day: { label: "Half Day", urduLabel: "نصف دن", color: "#38BDF8" },
  on_leave: { label: "On Leave", urduLabel: "رخصت", color: "#A855F7" },
  absent: { label: "Absent", urduLabel: "غیر حاضر", color: "#EF4444" },
  unmarked: { label: "Not Marked", urduLabel: "غیر نشان زد", color: "#64748B" },
};

export const LEAVE_TYPES = [
  "Casual Leave",
  "Sick Leave",
  "Urgent / Personal",
  "Annual Leave",
] as const;

export const SPENDING_CATEGORIES = [
  "Ads & Lead Generation",
  "Cloud, Domains & Hosting",
  "Software & AI Tools",
  "Salaries & Bonuses",
  "Freelance / Contractors",
  "Office, Utilities & Internet",
  "Hardware & Equipment",
  "Other Expense",
] as const;

export const PAYMENT_METHODS = [
  "Bank Transfer",
  "JazzCash / Nayapay / SadaPay",
  "Company Card",
  "Payoneer / Wise / Stripe",
  "Cash",
] as const;

export const INITIAL_PORTAL_ACCOUNTS = [
  {
    name: "ERP Owner",
    email: "owner@devzard.app",
    defaultPassword: "Owner@123",
    portalRole: "erp_owner" as PortalRole,
    jobTitle: "ERP Owner",
    sectionSlug: null,
  },
  {
    name: "IT CEO",
    email: "it.ceo@devzard.app",
    defaultPassword: "ItCeo@123",
    portalRole: "it_ceo" as PortalRole,
    jobTitle: "IT CEO",
    sectionSlug: "it",
  },
  {
    name: "BD CEO",
    email: "bd.ceo@devzard.app",
    defaultPassword: "BdCeo@123",
    portalRole: "bd_ceo" as PortalRole,
    jobTitle: "BD CEO",
    sectionSlug: "bd",
  },
] as const;
