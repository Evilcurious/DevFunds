import type {
  AppSettings,
  AttendanceStatus,
  CurrencyCode,
  PortalRole,
  StaffStatus,
} from "./types";

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: "DevFunds",
  tagline: "Operations, Revenue, Spending & Attendance ERP",
  currency: "PKR",
  timezone: "Asia/Karachi",
  showSetupHint: true,
};

export const CURRENCIES: Record<
  CurrencyCode,
  { code: CurrencyCode; symbol: string; label: string }
> = {
  PKR: { code: "PKR", symbol: "Rs.", label: "Pakistani Rupee (Rs.)" },
  USD: { code: "USD", symbol: "$", label: "US Dollar ($)" },
  AED: { code: "AED", symbol: "AED", label: "UAE Dirham (AED)" },
  GBP: { code: "GBP", symbol: "£", label: "British Pound (£)" },
  EUR: { code: "EUR", symbol: "€", label: "Euro (€)" },
};

export const PORTAL_META: Record<
  PortalRole,
  {
    role: PortalRole;
    title: string;
    shortTitle: string;
    subtitle: string;
    badgeBg: string;
    defaultSection: string | null;
    capabilities: string[];
  }
> = {
  erp_owner: {
    role: "erp_owner",
    title: "ERP Owner Portal",
    shortTitle: "ERP Owner",
    subtitle: "Full executive access across finance, sections, accounts, staff & attendance",
    badgeBg: "bg-blue-700 text-white",
    defaultSection: null,
    capabilities: [
      "Add, edit & delete BD, IT, or any section spending",
      "Add, edit & delete customer earnings & work links",
      "Create, rename, divide & remove staff sections",
      "Manage CEOs, staff accounts, passwords, attendance & currency settings",
    ],
  },
  it_ceo: {
    role: "it_ceo",
    title: "IT CEO Portal",
    shortTitle: "IT CEO",
    subtitle: "Manage IT department spending, delivered customer work, IT staff & attendance",
    badgeBg: "bg-blue-600 text-white",
    defaultSection: "it",
    capabilities: [
      "Add & edit IT department spending records",
      "Add & edit successful customers & attach IT delivered work links",
      "Create IT staff accounts & set status (Active, Free, Busy, Not Available)",
      "Track & mark IT team daily attendance",
    ],
  },
  bd_ceo: {
    role: "bd_ceo",
    title: "BD CEO Portal",
    shortTitle: "BD CEO",
    subtitle: "Manage BD department spending, closed customer deals, BD staff & attendance",
    badgeBg: "bg-sky-600 text-white",
    defaultSection: "bd",
    capabilities: [
      "Add & edit BD department spending records",
      "Add & edit successful customers, payments & client details",
      "Create BD staff accounts & set status (Active, Free, Busy, Not Available)",
      "Track & mark BD team daily attendance",
    ],
  },
  staff: {
    role: "staff",
    title: "Staff Portal",
    shortTitle: "Staff Member",
    subtitle: "View workspace metrics & update your live availability, skills, bio & attendance",
    badgeBg: "bg-slate-700 text-white",
    defaultSection: null,
    capabilities: [
      "Update live status: Active, Free, Busy, or Not Available",
      "Edit personal skills tags, bio & free-time availability window",
      "Check in & check out daily attendance",
      "View-only access to company overview & team directory",
    ],
  },
};

export const STAFF_STATUS_META: Record<
  StaffStatus,
  {
    value: StaffStatus;
    label: string;
    dotClass: string;
    pillClass: string;
  }
> = {
  active: {
    value: "active",
    label: "Active",
    dotClass: "bg-emerald-500",
    pillClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  free: {
    value: "free",
    label: "Free",
    dotClass: "bg-blue-500",
    pillClass:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  },
  busy: {
    value: "busy",
    label: "Busy",
    dotClass: "bg-amber-500",
    pillClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  },
  not_available: {
    value: "not_available",
    label: "Not Available",
    dotClass: "bg-rose-500",
    pillClass:
      "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus | "unmarked",
  {
    label: string;
    pillClass: string;
  }
> = {
  present: {
    label: "Present",
    pillClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  late: {
    label: "Late",
    pillClass:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  },
  half_day: {
    label: "Half Day",
    pillClass:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  },
  on_leave: {
    label: "On Leave",
    pillClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-300 dark:border-indigo-500/30",
  },
  absent: {
    label: "Absent",
    pillClass:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  },
  unmarked: {
    label: "Not Marked",
    pillClass:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700",
  },
};

export const SPENDING_CATEGORIES = [
  "Ads & Lead Generation",
  "Cloud, Domains & Hosting",
  "Software & AI Tools",
  "Salaries & Bonuses",
  "Freelance / Contractors",
  "Office, Utilities & Internet",
  "Hardware & Equipment",
  "Travel & Client Meetings",
  "Other Operational Expense",
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
    jobTitle: "Founder & ERP Owner",
    sectionSlug: null,
  },
  {
    name: "IT Department CEO",
    email: "it.ceo@devzard.app",
    defaultPassword: "ItCeo@123",
    portalRole: "it_ceo" as PortalRole,
    jobTitle: "Chief Executive — IT",
    sectionSlug: "it",
  },
  {
    name: "BD Department CEO",
    email: "bd.ceo@devzard.app",
    defaultPassword: "BdCeo@123",
    portalRole: "bd_ceo" as PortalRole,
    jobTitle: "Chief Executive — Business Development",
    sectionSlug: "bd",
  },
] as const;
