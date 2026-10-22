import { CURRENCIES } from "./constants";
import type { CurrencyCode } from "./types";

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: CurrencyCode = "PKR",
  toCurrency: CurrencyCode = "PKR"
): number {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (fromCurrency === toCurrency) return safe;
  const fromRate = CURRENCIES[fromCurrency]?.pkrRate ?? 1;
  const toRate = CURRENCIES[toCurrency]?.pkrRate ?? 1;
  const inPkr = safe * fromRate;
  return inPkr / toRate;
}

export function formatMoney(
  amount: number,
  toCurrency: CurrencyCode = "PKR",
  fromCurrency?: CurrencyCode
): string {
  const converted = fromCurrency
    ? convertCurrencyAmount(amount, fromCurrency, toCurrency)
    : amount;
  const meta = CURRENCIES[toCurrency] ?? CURRENCIES.PKR;
  const safe = Number.isFinite(converted) ? converted : 0;
  const isNegative = safe < 0;
  const abs = Math.abs(safe);
  const rounded = Math.round(abs * 100) / 100;
  const formatted = new Intl.NumberFormat(
    toCurrency === "PKR" ? "en-PK" : "en-US",
    {
      minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }
  ).format(rounded);
  const prefix =
    meta.symbol.endsWith(".") || meta.symbol.length > 1
      ? `${meta.symbol} `
      : meta.symbol;
  return `${isNegative ? "-" : ""}${prefix}${formatted}`;
}

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// Work day resets every day at 4:00 AM in workspace timezone
export function todayInTimezone(
  timezone = "Asia/Karachi",
  nowMs = Date.now()
): string {
  const shifted = new Date(nowMs - FOUR_HOURS_MS);
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(shifted);
    const y = parts.find((p) => p.type === "year")?.value ?? "2026";
    const m = parts.find((p) => p.type === "month")?.value ?? "01";
    const d = parts.find((p) => p.type === "day")?.value ?? "01";
    return `${y}-${m}-${d}`;
  } catch {
    return shifted.toISOString().slice(0, 10);
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
