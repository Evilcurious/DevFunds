import { CURRENCIES } from "./constants";
import type { CurrencyCode } from "./types";

export function formatMoney(
  amount: number,
  currency: CurrencyCode = "PKR"
): string {
  const meta = CURRENCIES[currency] ?? CURRENCIES.PKR;
  const safe = Number.isFinite(amount) ? amount : 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const formatted = new Intl.NumberFormat(
    currency === "PKR" ? "en-PK" : "en-US",
    {
      minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }
  ).format(abs);
  const prefix = meta.symbol.endsWith(".") || meta.symbol.length > 1
    ? `${meta.symbol} `
    : meta.symbol;
  return `${isNegative ? "-" : ""}${prefix}${formatted}`;
}

export function todayInTimezone(timezone = "Asia/Karachi"): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function formatDateTime(
  iso: string | null | undefined,
  timezone = "Asia/Karachi"
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatTimeShort(
  iso: string | null | undefined,
  timezone = "Asia/Karachi"
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  } catch {
    return date.toTimeString().slice(0, 5);
  }
}

export function slugifySection(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}
