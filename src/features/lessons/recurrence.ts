import "server-only";
import { RRule, Weekday, type Options } from "rrule";
import { MAX_RECURRENCE_OCCURRENCES } from "@/lib/constants";
import type { LessonColor } from "@/lib/lesson-colors";

/** 0=Mon … 6=Sun → rrule weekday constants. */
const RRULE_WEEKDAYS = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

/** Mon-based weekday index (0..6) of a local Date. */
function localWeekday(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export type RecurrenceEnd = { kind: "count"; count: number } | { kind: "until"; until: Date };

export interface RecurrenceSpec {
  /** Local Date of the first occurrence (carries the wall-clock time). */
  dtstart: Date;
  /** Every N weeks. */
  interval: number;
  /** Mon-based weekday indices (0..6); empty → the dtstart's weekday. */
  weekdays: number[];
  end: RecurrenceEnd;
}

// rrule treats Dates as UTC. To keep a stable wall-clock (no per-tutor zones in
// MVP — see date.ts), we feed it "floating" UTC dates that carry the local
// clock, then read the same clock back as a local Date.
function toFloatingUTC(d: Date): Date {
  return new Date(
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()),
  );
}

function fromFloatingUTC(d: Date): Date {
  return new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    d.getUTCHours(),
    d.getUTCMinutes(),
  );
}

export function buildRule(spec: RecurrenceSpec): RRule {
  const days = (spec.weekdays.length ? spec.weekdays : [localWeekday(spec.dtstart)])
    .map((d) => RRULE_WEEKDAYS[d])
    .filter((w): w is Weekday => w !== undefined);

  const options: Partial<Options> = {
    freq: RRule.WEEKLY,
    interval: Math.max(1, spec.interval),
    byweekday: days,
    dtstart: toFloatingUTC(spec.dtstart),
  };

  if (spec.end.kind === "count") {
    options.count = Math.min(Math.max(1, spec.end.count), MAX_RECURRENCE_OCCURRENCES);
  } else {
    options.until = toFloatingUTC(spec.end.until);
  }

  return new RRule(options);
}

/** Concrete local start Dates for the series, capped at MAX_RECURRENCE_OCCURRENCES. */
export function expandOccurrences(spec: RecurrenceSpec): Date[] {
  const rule = buildRule(spec);
  const dates = rule.all((_date, i) => i < MAX_RECURRENCE_OCCURRENCES);
  return dates.map(fromFloatingUTC);
}

/** The RRULE pattern text to store (dtstart lives in its own column). */
export function ruleToStored(rule: RRule): string {
  const line = rule
    .toString()
    .split("\n")
    .find((l) => l.startsWith("RRULE:"));
  return line ? line.replace(/^RRULE:/, "") : rule.toString();
}

/**
 * One series + its materialised occurrences, ready for the create_lesson_series
 * RPC. Declared as a `type` (not `interface`) so it carries an implicit index
 * signature and stays assignable to the RPC's `Json` argument.
 */
export type SeriesPayloadItem = {
  rrule: string;
  /** ISO start of the first occurrence (carries the wall-clock time). */
  dtstart: string;
  duration_min: number;
  topic: string | null;
  note: string | null;
  color: LessonColor | null;
  /** ISO start of each generated lesson. */
  occurrences: string[];
};

/** A per-weekday recurrence plan: its spec, lesson length, and expanded dates. */
export interface RecurrencePlan {
  spec: RecurrenceSpec;
  duration_min: number;
  occurrences: Date[];
}

/**
 * Build the JSON payload for the create_lesson_series RPC from per-weekday plans
 * and the shared topic/note/colour. Pure (no DB/IO) so it's unit-testable; the
 * action passes the result straight to one atomic RPC call.
 */
export function buildSeriesPayload(
  plans: RecurrencePlan[],
  meta: { topic: string | null; note: string | null; color: LessonColor | null },
): SeriesPayloadItem[] {
  return plans.map(({ spec, duration_min, occurrences }) => ({
    rrule: ruleToStored(buildRule(spec)),
    dtstart: spec.dtstart.toISOString(),
    duration_min,
    topic: meta.topic,
    note: meta.note,
    color: meta.color,
    occurrences: occurrences.map((d) => d.toISOString()),
  }));
}
