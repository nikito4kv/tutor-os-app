/** Date/time formatting helpers (ru-RU). */

import { t } from "@/lib/i18n";

const dateTimeFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** Date only (no time), e.g. for a payment's date. */
export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Time only, e.g. "15:00" — used for lesson chips in the schedule. */
export function formatTime(iso: string): string {
  return timeFmt.format(new Date(iso));
}

const dayLabelFmt = new Intl.DateTimeFormat("ru-RU", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** Short day header for the week grid / list, e.g. "ср, 11 июн.". */
export function formatDayLabel(d: Date): string {
  return dayLabelFmt.format(d);
}

const monthLabelFmt = new Intl.DateTimeFormat("ru-RU", {
  month: "long",
  year: "numeric",
});

/** Month header, e.g. "июнь 2026". */
export function formatMonthLabel(d: Date): string {
  return monthLabelFmt.format(d);
}

const relativeFmt = new Intl.RelativeTimeFormat("ru", { numeric: "auto", style: "short" });

/**
 * Compact, localized "time until" label, e.g. "через 2 ч.", "через 15 мин.",
 * "завтра". Picks the largest sensible unit (minutes < 1h, hours < 1d, else
 * days). Used for the dashboard "next lesson" countdown. Naive-local like the
 * rest of the MVP.
 */
export function formatRelativeToNow(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const minutes = Math.round(diffMs / 60_000);
  if (Math.abs(minutes) < 60) return relativeFmt.format(minutes, "minute");
  const hours = Math.round(diffMs / 3_600_000);
  if (Math.abs(hours) < 24) return relativeFmt.format(hours, "hour");
  return relativeFmt.format(Math.round(diffMs / 86_400_000), "day");
}

/**
 * Absolute "when" label for a lesson: "Сегодня, 18:00" / "Завтра, 17:00" /
 * "13 июня, 15:00". Used by the dashboard hero and the student-card overview.
 */
export function formatWhenLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (isSameDay(date, now)) return `${t.common.dateTime.today}, ${formatTime(iso)}`;
  if (isSameDay(date, addDays(now, 1))) return `${t.common.dateTime.tomorrow}, ${formatTime(iso)}`;
  return formatDateTime(iso);
}

// ── Week math ──────────────────────────────────────────────────────────────
// MVP simplification: times are handled naively in the runtime's local zone
// (single-tutor product, no per-user timezones yet).

/** Monday 00:00 of the week containing `d`. */
export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  const dow = r.getDay(); // 0=Sun … 6=Sat
  const sinceMonday = (dow + 6) % 7;
  r.setDate(r.getDate() - sinceMonday);
  return r;
}

/** A new Date `n` days after `d` (n may be negative). */
export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** First day of the month at local midnight. */
export function startOfMonth(d: Date): Date {
  const r = new Date(d);
  r.setDate(1);
  r.setHours(0, 0, 0, 0);
  return r;
}

/** A new Date `n` months after `d` (n may be negative), pinned to day 1. */
export function addMonths(d: Date, n: number): Date {
  const r = startOfMonth(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** Whether two dates fall on the same calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Whether two dates fall in the same calendar month. */
export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** ISO bounds [weekStart, weekStart + 7d) for range queries. */
export function weekRange(weekStart: Date): { from: string; to: string } {
  return { from: weekStart.toISOString(), to: addDays(weekStart, 7).toISOString() };
}

/** ISO bounds [monthStart, nextMonthStart) for range queries. */
export function monthRange(monthStart: Date): { from: string; to: string } {
  return { from: monthStart.toISOString(), to: addMonths(monthStart, 1).toISOString() };
}

/** Local "YYYY-MM-DD" key, e.g. for the `?week=` URL param. */
export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a local "YYYY-MM-DD" key back to a Date at local midnight; null if invalid. */
export function parseDateKey(key: string | undefined | null): Date | null {
  if (!key) return null;
  const parsed = new Date(`${key}T00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Bucket lessons (anything with `starts_at`) into per-day groups, sorted by
 * time. Days with no lessons are omitted — used by the list view. Pass
 * `desc` to order newest-first (for the history view).
 */
export function groupLessonsByDay<T extends { starts_at: string }>(
  lessons: T[],
  desc = false,
): { date: Date; items: T[] }[] {
  const groups: { date: Date; items: T[] }[] = [];
  const byKey = new Map<string, { date: Date; items: T[] }>();

  const sorted = [...lessons].sort((a, b) =>
    desc ? b.starts_at.localeCompare(a.starts_at) : a.starts_at.localeCompare(b.starts_at),
  );
  for (const lesson of sorted) {
    const d = new Date(lesson.starts_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    let group = byKey.get(key);
    if (!group) {
      group = { date: d, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(lesson);
  }

  return groups;
}
