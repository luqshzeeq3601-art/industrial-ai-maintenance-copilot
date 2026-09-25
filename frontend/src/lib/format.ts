const LOCALE = "en-GB";

/** API timestamps are UTC, sometimes without an offset ("2026-09-17 08:30:00"). */
export function parseApiTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = value.includes("T") ? value : value.replace(" ", "T");
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(iso);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T00:00:00` : hasZone ? iso : `${iso}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const shortDateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});
const timeFmt = new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false });
const numberFmt = new Intl.NumberFormat(LOCALE);

/** "10 Sep 2026" */
export const formatDate = (value: string | null | undefined) => {
  const d = parseApiTime(value);
  return d ? dateFmt.format(d) : "—";
};

/** "10 Sep 2026, 14:32" */
export const formatDateTime = (value: string | null | undefined) => {
  const d = parseApiTime(value);
  return d ? dateTimeFmt.format(d) : "—";
};

/** "10 Sep, 14:32" for dense lists */
export const formatShortDateTime = (value: string | null | undefined) => {
  const d = parseApiTime(value);
  return d ? shortDateTimeFmt.format(d) : "—";
};

export const formatTime = (value: string | Date) => {
  const d = typeof value === "string" ? parseApiTime(value) : value;
  return d ? timeFmt.format(d) : "—";
};

export const formatNumber = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : numberFmt.format(Number(value.toFixed(digits)));

/** "12,153 h" */
export const formatHours = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : `${formatNumber(value, digits)} h`;

/** YYYY-MM-DD for the local calendar day `daysAgo` days back. */
export function isoDay(daysAgo = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Overdue when the due date is before today (a due date of today is not yet overdue). */
export const isOverdue = (due: string | null | undefined) => !!due && due < isoDay(0);

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");

/** "snake_case" or "kebab-case" → "Sentence case" */
export const humanize = (value: string) => {
  const words = value.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
