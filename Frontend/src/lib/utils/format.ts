import { format, differenceInDays, parseISO, isValid } from "date-fns";

export function formatCurrency(value: number | null | undefined, currency = "INR"): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value);
}

export function formatDate(
  value: string | Date | null | undefined,
  pattern = "dd MMM yyyy",
): string {
  if (!value) return "—";
  const d = typeof value === "string" ? parseISO(value) : value;
  if (!isValid(d)) return "—";
  return format(d, pattern);
}

export function formatDateTime(value: string | Date | null | undefined): string {
  return formatDate(value, "dd MMM yyyy, HH:mm");
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const d = parseISO(value);
  if (!isValid(d)) return null;
  return differenceInDays(d, new Date());
}

export function pct(value: number | null | undefined, digits = 1): string {
  if (value == null || Number.isNaN(value) || !Number.isFinite(value)) return "N/A";
  return `${value.toFixed(digits)}%`;
}
