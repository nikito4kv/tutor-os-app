"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createHomeworkFromForm } from "@/features/homework/create";
import { DEFAULT_RECURRENCE_COUNT, LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import { asLessonColor, type LessonColor } from "@/lib/lesson-colors";
import { notifyStudentByEmail } from "@/lib/email/notify";
import { lessonsScheduledEmail } from "@/lib/email/templates";
import { notifyStudentByTelegram, notifyTutorByTelegram } from "@/lib/telegram/notify";
import { lessonChangedMessage, lowBalanceMessage } from "@/lib/telegram/messages";
import { formatWhenLabel } from "@/lib/date";
import { parseLessonCardEditForm, parseLessonRescheduleForm } from "./schema";
import { getLessonDetail, type LessonDetail } from "./queries";
import {
  buildSeriesPayload,
  expandOccurrences,
  type RecurrenceEnd,
  type RecurrencePlan,
  type RecurrenceSpec,
} from "./recurrence";

export interface LessonFormState {
  ok?: boolean;
  error?: string;
}

/** Trim a FormData entry to a non-empty string, or null. */
function optionalString(v: FormDataEntryValue | null): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
}

function revalidateLesson(studentId: string) {
  revalidatePath("/schedule");
  revalidatePath(`/students/${studentId}`);
}

/**
 * Best-effort: when a genuine completion / no-show drops the student to/under the
 * low-balance threshold, nudge the tutor on Telegram. Gated on a real charge
 * (`alreadyDone === false`), so a re-completion of an already-terminal lesson
 * doesn't ping, and at most one ping fires per actual completion. No persistent
 * dedup key — a fresh low-balance situation after a package top-up must not be
 * suppressed by a stale record.
 */
async function notifyLowBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  lessonsLeft: number,
  alreadyDone: boolean,
): Promise<void> {
  if (alreadyDone) return;
  if (lessonsLeft > LOW_BALANCE_THRESHOLD) return;
  const { data: student } = await supabase
    .from("student")
    .select("name, tutor_id")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) return;
  await notifyTutorByTelegram({
    tutorId: student.tutor_id,
    event: "low_balance",
    logLabel: "low balance",
    build: ({ appUrl }) =>
      lowBalanceMessage(student.name, lessonsLeft, `${appUrl}/students/${studentId}`),
  });
}

const UUID = z.string().uuid();

/** "HH:mm" → minutes since midnight, or null if malformed. */
function parseHm(v: FormDataEntryValue | null): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(typeof v === "string" ? v : "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** A local Date on `date`'s calendar day at `minutes` since midnight. */
function atMinutes(date: Date, minutes: number): Date {
  const d = new Date(date);
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
}

type LessonSlot = {
  startsAt: Date;
  durationMin: number;
};

type ExistingLessonSlot = {
  student_id: string;
  starts_at: string;
  duration_min: number;
};

const CONFLICT_LOOKBACK_MS = 24 * 60 * 60 * 1000;

function slotEndMs(slot: LessonSlot): number {
  return slot.startsAt.getTime() + slot.durationMin * 60 * 1000;
}

function overlapsExistingLesson(slot: LessonSlot, lesson: ExistingLessonSlot): boolean {
  const lessonStartMs = new Date(lesson.starts_at).getTime();
  if (Number.isNaN(lessonStartMs)) return false;
  const lessonEndMs = lessonStartMs + lesson.duration_min * 60 * 1000;
  return slot.startsAt.getTime() < lessonEndMs && slotEndMs(slot) > lessonStartMs;
}

function formatConflictDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

async function findLessonConflict(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slots: LessonSlot[],
): Promise<string | null> {
  if (slots.length === 0) return null;

  const minStartMs = Math.min(...slots.map((slot) => slot.startsAt.getTime()));
  const maxEndMs = Math.max(...slots.map(slotEndMs));
  const from = new Date(minStartMs - CONFLICT_LOOKBACK_MS).toISOString();
  const to = new Date(maxEndMs).toISOString();

  const { data, error } = await supabase
    .from("lesson")
    .select("student_id, starts_at, duration_min")
    .eq("status", "scheduled")
    .gte("starts_at", from)
    .lt("starts_at", to)
    .order("starts_at", { ascending: true });

  if (error) return error.message;

  const conflict = (data ?? []).find((lesson) =>
    slots.some((slot) => overlapsExistingLesson(slot, lesson)),
  );
  if (!conflict) return null;

  const { data: student } = await supabase
    .from("student")
    .select("name")
    .eq("id", conflict.student_id)
    .maybeSingle();
  const studentName = student?.name?.trim() || "другим учеником";

  return `На ${formatConflictDateTime(conflict.starts_at)} уже есть урок с учеником ${studentName}. Выберите другое время.`;
}

/**
 * Create one or more lessons from the schedule form. Each selected weekday carries
 * its own time (start/end → duration). "Не повторять" inserts a single lesson per
 * weekday (no series); weekly / every-2-weeks creates a `lesson_series` per weekday
 * and bulk-inserts its materialised occurrences. RLS (lesson_all → owns_student)
 * guarantees the student belongs to this tutor.
 */
export async function createLessonAction(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const student_id = String(formData.get("student_id") ?? "");
  if (!UUID.safeParse(student_id).success) {
    return { error: "Выберите ученика" };
  }

  const startDate = new Date(`${String(formData.get("start_date") ?? "")}T00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return { error: "Укажите дату начала" };
  }

  const weekdays = Array.from(
    new Set(
      formData
        .getAll("repeat_weekday")
        .map((v) => Number(v))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
    ),
  ).sort((a, b) => a - b);
  if (weekdays.length === 0) {
    return { error: "Выберите хотя бы один день недели" };
  }

  const topic = optionalString(formData.get("topic"));
  const note = optionalString(formData.get("note"));
  const color = asLessonColor(optionalString(formData.get("color")));

  // Per-day start/end → a validated {dtstart, duration} for each weekday.
  const dayPlans: { weekday: number; dtstart: Date; duration_min: number }[] = [];
  for (const d of weekdays) {
    const startMin = parseHm(formData.get(`start_${d}`));
    const endMin = parseHm(formData.get(`end_${d}`));
    if (startMin == null || endMin == null) {
      return { error: "Укажите время для выбранных дней" };
    }
    if (endMin <= startMin) {
      return { error: "Время окончания должно быть позже начала" };
    }
    dayPlans.push({
      weekday: d,
      dtstart: atMinutes(startDate, startMin),
      duration_min: endMin - startMin,
    });
  }

  const repeat = String(formData.get("repeat") ?? "none");
  const repeating = repeat === "weekly" || repeat === "biweekly";
  const interval = repeat === "biweekly" ? 2 : 1;

  const supabase = await createClient();

  // One-off: a single lesson per weekday (the first occurrence on/after the start
  // date), no series — so it edits without series-scope prompts.
  if (!repeating) {
    const rows = dayPlans.flatMap((plan) => {
      const [first] = expandOccurrences({
        dtstart: plan.dtstart,
        interval: 1,
        weekdays: [plan.weekday],
        end: { kind: "count", count: 1 },
      });
      return first
        ? [
            {
              student_id,
              starts_at: first.toISOString(),
              duration_min: plan.duration_min,
              topic,
              note,
              color,
            },
          ]
        : [];
    });
    if (rows.length === 0) {
      return { error: "Не удалось рассчитать даты" };
    }
    const conflict = await findLessonConflict(
      supabase,
      rows.map((row) => ({
        startsAt: new Date(row.starts_at),
        durationMin: row.duration_min,
      })),
    );
    if (conflict) return { error: conflict };

    const { error } = await supabase.from("lesson").insert(rows);
    if (error) return { error: error.message };

    const earliest = new Date(Math.min(...rows.map((r) => new Date(r.starts_at).getTime())));
    await notifyStudentByEmail({
      supabase,
      studentId: student_id,
      logLabel: "lesson notification",
      build: ({ name, url }) =>
        lessonsScheduledEmail({
          studentName: name,
          when: formatWhenLabel(earliest.toISOString()),
          count: rows.length,
          url,
        }),
    });
    revalidateLesson(student_id);
    return { ok: true };
  }

  // Recurring: parse the end rule once, then create a series per weekday.
  let end: RecurrenceEnd;
  if (formData.get("repeat_end") === "until") {
    const until = new Date(`${String(formData.get("repeat_until") ?? "")}T23:59`);
    if (Number.isNaN(until.getTime())) return { error: "Укажите дату окончания повтора" };
    end = { kind: "until", until };
  } else {
    end = {
      kind: "count",
      count: Number(formData.get("repeat_count")) || DEFAULT_RECURRENCE_COUNT,
    };
  }

  const recurrencePlans: RecurrencePlan[] = dayPlans
    .map((plan) => {
      const spec: RecurrenceSpec = {
        dtstart: plan.dtstart,
        interval,
        weekdays: [plan.weekday],
        end,
      };
      return { spec, duration_min: plan.duration_min, occurrences: expandOccurrences(spec) };
    })
    .filter(({ occurrences }) => occurrences.length > 0);

  const conflict = await findLessonConflict(
    supabase,
    recurrencePlans.flatMap(({ duration_min, occurrences }) =>
      occurrences.map((startsAt) => ({ startsAt, durationMin: duration_min })),
    ),
  );
  if (conflict) return { error: conflict };

  const series = buildSeriesPayload(recurrencePlans, { topic, note, color });
  if (series.length === 0) {
    return { error: "Не удалось рассчитать даты" };
  }

  // One atomic RPC: all series + all their lessons in a single transaction, so a
  // partial failure can't half-create the schedule and a resubmit can't duplicate
  // it (see create_lesson_series / migration 0011).
  const { error } = await supabase.rpc("create_lesson_series", {
    p_student_id: student_id,
    p_series: series,
  });
  if (error) return { error: error.message };

  const occurrences = recurrencePlans.flatMap((plan) => plan.occurrences);
  const earliest = new Date(Math.min(...occurrences.map((d) => d.getTime())));
  await notifyStudentByEmail({
    supabase,
    studentId: student_id,
    logLabel: "lesson notification",
    build: ({ name, url }) =>
      lessonsScheduledEmail({
        studentName: name,
        when: formatWhenLabel(earliest.toISOString()),
        count: occurrences.length,
        url,
      }),
  });
  revalidateLesson(student_id);
  return { ok: true };
}

/** Update only a lesson card's descriptive fields. RLS scopes to owner. */
export async function updateLessonCardAction(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const lessonId = String(formData.get("lesson_id") ?? "");
  if (!lessonId) return { error: "Урок не найден" };

  const parsed = parseLessonCardEditForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const { topic, note } = parsed.data;
  const color = asLessonColor(optionalString(formData.get("color")));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .update({
      topic,
      note,
      color,
    })
    .eq("id", lessonId)
    .select("student_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Урок не найден" };

  revalidateLesson(data.student_id);
  return { ok: true };
}

/** Update only a scheduled/canceled lesson's date and duration. RLS scopes to owner. */
export async function updateLessonAction(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const lessonId = String(formData.get("lesson_id") ?? "");
  if (!lessonId) return { error: "Урок не найден" };

  const supabase = await createClient();

  const reactivate = formData.get("reactivate") === "1";
  const parsed = parseLessonRescheduleForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  const { starts_at, duration_min } = parsed.data;

  // Resolve the notification target through the authenticated RLS query. Form
  // fields are display state and must never choose another student's recipient.
  const { data: before, error: beforeError } = await supabase
    .from("lesson")
    .select("starts_at, student_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (beforeError) return { error: beforeError.message };
  if (!before) return { error: "Урок не найден" };

  const patch: Database_LessonUpdate = {
    starts_at: starts_at.toISOString(),
    duration_min,
  };
  if (reactivate) patch.status = "scheduled";

  const { data, error } = await supabase
    .from("lesson")
    .update(patch)
    .eq("id", lessonId)
    .in("status", ["scheduled", "canceled"])
    .select("id")
    .maybeSingle();
  if (error) {
    return { error: error.message };
  }

  const timeChanged = new Date(before.starts_at).getTime() !== starts_at.getTime();
  if (data && (timeChanged || reactivate)) {
    await notifyStudentByTelegram({
      studentId: before.student_id,
      event: "lesson_rescheduled",
      logLabel: "lesson rescheduled notification",
      build: ({ url }) =>
        lessonChangedMessage({
          kind: "rescheduled",
          when: formatWhenLabel(starts_at.toISOString()),
          url,
        }),
    });
  }

  revalidateLesson(before.student_id);
  return { ok: true };
}

/**
 * Reschedule a recurring lesson with a scope. "one" touches just this occurrence; for
 * "future"/"all" the same time-delta and duration are applied to the other
 * scheduled lessons of the series — each keeps its own slot, shifted by the
 * delta. Card fields stay untouched. RLS scopes everything to the owner.
 */
export async function updateSeriesAction(
  _prev: LessonFormState,
  formData: FormData,
): Promise<LessonFormState> {
  const lessonId = String(formData.get("lesson_id") ?? "");
  const requestedScope = String(formData.get("scope") ?? "one");
  const scope: SeriesScope = ["one", "future", "all"].includes(requestedScope)
    ? (requestedScope as SeriesScope)
    : "one";
  const reactivate = formData.get("reactivate") === "1";
  if (!lessonId) return { error: "Урок не найден" };

  const parsed = parseLessonRescheduleForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }
  const { starts_at, duration_min } = parsed.data;

  const supabase = await createClient();

  // The lesson row is the authoritative source for the student, series and
  // original date. RLS proves the tutor owns this occurrence.
  const { data: before, error: beforeError } = await supabase
    .from("lesson")
    .select("starts_at, student_id, series_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (beforeError) return { error: beforeError.message };
  if (!before) return { error: "Урок не найден" };

  const seriesId = before.series_id;
  const originalStartsAt = before.starts_at;
  if (scope !== "one" && !seriesId) {
    return { error: "Урок не входит в серию" };
  }

  let affectedCount = 1;
  if (scope !== "one" && seriesId) {
    let countQuery = supabase
      .from("lesson")
      .select("id", { count: "exact", head: true })
      .eq("series_id", seriesId)
      .eq("status", "scheduled");
    if (scope === "future") countQuery = countQuery.gte("starts_at", originalStartsAt);
    const { count, error: countError } = await countQuery;
    if (countError) return { error: countError.message };
    affectedCount = count ?? 1;
  }

  const patch: Database_LessonUpdate = {
    starts_at: starts_at.toISOString(),
    duration_min,
  };
  if (reactivate) patch.status = "scheduled";
  const { data: touched, error } = await supabase
    .from("lesson")
    .update(patch)
    .eq("id", lessonId)
    .in("status", ["scheduled", "canceled"])
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };

  if (scope !== "one" && seriesId) {
    const originalMs = new Date(originalStartsAt).getTime();
    const { error: shiftError } = await supabase.rpc("shift_series_lessons", {
      p_series_id: seriesId,
      p_exclude_id: lessonId,
      p_from: scope === "future" ? originalStartsAt : null,
      p_delta_secs: (starts_at.getTime() - originalMs) / 1000,
      p_duration_min: duration_min,
    });
    if (shiftError) return { error: shiftError.message };
  }

  const timeChanged = new Date(before.starts_at).getTime() !== starts_at.getTime();
  if (touched && (timeChanged || reactivate)) {
    await notifyStudentByTelegram({
      studentId: before.student_id,
      event: "lesson_rescheduled",
      logLabel: "lesson rescheduled notification",
      build: ({ url }) =>
        scope === "one"
          ? lessonChangedMessage({
              kind: "rescheduled",
              when: formatWhenLabel(starts_at.toISOString()),
              url,
            })
          : lessonChangedMessage({ kind: "rescheduledMany", count: affectedCount, url }),
    });
  }

  revalidateLesson(before.student_id);
  return { ok: true };
}

type Database_LessonUpdate = {
  starts_at?: string;
  duration_min?: number;
  topic?: string | null;
  note?: string | null;
  color?: LessonColor | null;
  status?: "scheduled" | "done" | "canceled" | "no_show";
};

export interface CompleteLessonState {
  ok?: boolean;
  error?: string;
  lessonsLeft?: number;
  lowBalance?: boolean;
}

/**
 * Complete a lesson and capture what was covered. Topic/note default to the
 * existing values (the DB function coalesces nulls). Optionally assigns a
 * homework linked to the lesson when a title is present. The DB function
 * `complete_lesson` is atomic and idempotent (re-completing won't double-charge).
 */
export async function completeLessonAction(
  _prev: CompleteLessonState,
  formData: FormData,
): Promise<CompleteLessonState> {
  const lessonId = String(formData.get("lesson_id") ?? "");
  if (!lessonId) return { error: "Урок не найден" };

  const supabase = await createClient();
  const { data: lesson, error: lessonError } = await supabase
    .from("lesson")
    .select("student_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonError) return { error: lessonError.message };
  if (!lesson) return { error: "Урок не найден" };

  const studentId = lesson.student_id;
  const { data, error } = await supabase.rpc("complete_lesson", {
    p_lesson_id: lessonId,
    p_topic: optionalString(formData.get("topic")),
    p_note: optionalString(formData.get("note")),
  });
  if (error) {
    return { error: error.message };
  }

  const r = data as { lessons_left: number; already_done?: boolean };

  const hwTitle = optionalString(formData.get("title"));
  if (hwTitle && r.already_done !== true) {
    const hwErr = await createHomeworkFromForm({
      supabase,
      studentId,
      lessonId,
      title: hwTitle,
      description: optionalString(formData.get("description")),
      formData,
    });
    if (hwErr) return { error: hwErr };
  }

  await notifyLowBalance(supabase, studentId, r.lessons_left, r.already_done === true);
  revalidateLesson(studentId);
  return {
    ok: true,
    lessonsLeft: r.lessons_left,
    lowBalance: r.lessons_left <= LOW_BALANCE_THRESHOLD,
  };
}

/**
 * Mark a lesson as no-show. Charged like a completed lesson (idempotent in DB).
 * Returns the same balance shape as completion so the modal can surface a
 * low-balance warning when the no-show drops the student to/near zero.
 */
export async function markNoShowAction(
  lessonId: string,
  _studentId: string,
): Promise<CompleteLessonState> {
  const supabase = await createClient();
  const { data: lesson, error: lessonError } = await supabase
    .from("lesson")
    .select("student_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (lessonError) return { error: lessonError.message };
  if (!lesson) return { error: "Урок не найден" };

  const { data, error } = await supabase.rpc("complete_lesson", {
    p_lesson_id: lessonId,
    p_status: "no_show",
  });
  if (error) {
    return { error: error.message };
  }
  const r = data as { lessons_left: number; already_done?: boolean };
  await notifyLowBalance(supabase, lesson.student_id, r.lessons_left, r.already_done === true);
  revalidateLesson(lesson.student_id);
  return {
    ok: true,
    lessonsLeft: r.lessons_left,
    lowBalance: r.lessons_left <= LOW_BALANCE_THRESHOLD,
  };
}

/**
 * Reopen a completed / no-show lesson: send it back to `scheduled` and refund
 * the burnt lesson to a package. Atomic + idempotent in the DB function
 * `reopen_lesson` (re-reopening a non-terminal lesson won't double-refund). Any
 * homework assigned at completion is kept. RLS scopes to the owner.
 */
export async function reopenLessonAction(
  lessonId: string,
  studentId: string,
): Promise<CompleteLessonState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reopen_lesson", { p_lesson_id: lessonId });
  if (error) {
    return { error: error.message };
  }
  revalidateLesson(studentId);
  const r = data as { lessons_left: number };
  return { ok: true, lessonsLeft: r.lessons_left };
}

/** Cancel a SCHEDULED lesson (status → canceled). RLS guarantees ownership. */
export async function cancelLessonAction(lessonId: string, _studentId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .update({ status: "canceled" })
    .eq("id", lessonId)
    .in("status", ["scheduled"])
    .select("starts_at, student_id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    await notifyStudentByTelegram({
      studentId: data.student_id,
      event: "lesson_canceled",
      logLabel: "lesson canceled notification",
      build: ({ url }) =>
        lessonChangedMessage({ kind: "canceled", when: formatWhenLabel(data.starts_at), url }),
    });
    revalidateLesson(data.student_id);
    return;
  }

  revalidatePath("/schedule");
}

/**
 * Delete a lesson. Allowed only for scheduled/canceled — a done or no-show
 * lesson already spent balance, so deleting it would orphan the charge.
 */
export async function deleteLessonAction(lessonId: string, _studentId: string): Promise<void> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .delete()
    .eq("id", lessonId)
    .in("status", ["scheduled", "canceled"])
    .select("student_id")
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    revalidateLesson(data.student_id);
    return;
  }

  revalidatePath("/schedule");
}

/** Read wrapper so the client detail modal can load on open. RLS scopes to owner. */
export async function loadLessonDetailAction(lessonId: string): Promise<LessonDetail | null> {
  return getLessonDetail(lessonId);
}

// ── Recurring series: cancel / delete with scope ────────────────────────────

export type SeriesScope = "one" | "future" | "all";

export interface SeriesTarget {
  id: string;
  studentId: string;
  seriesId: string;
  startsAt: string;
}

interface SeriesSelection {
  ids: string[];
  studentId: string;
}

/** Resolve a scoped series action from an RLS-authorized anchor lesson. */
async function collectSeriesIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  target: SeriesTarget,
  scope: SeriesScope,
): Promise<SeriesSelection | null> {
  const { data: anchor, error: anchorError } = await supabase
    .from("lesson")
    .select("id, student_id, series_id, starts_at")
    .eq("id", target.id)
    .maybeSingle();
  if (anchorError) throw new Error(anchorError.message);
  if (!anchor) return null;

  if (scope === "one" || !anchor.series_id) {
    return { ids: [anchor.id], studentId: anchor.student_id };
  }

  let query = supabase
    .from("lesson")
    .select("id")
    .eq("series_id", anchor.series_id)
    .eq("status", "scheduled");
  if (scope === "future") query = query.gte("starts_at", anchor.starts_at);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return {
    ids: (data ?? []).map((row) => row.id),
    studentId: anchor.student_id,
  };
}

/** Cancel one / this-and-future / all scheduled lessons of a series. */
export async function cancelSeriesAction(target: SeriesTarget, scope: SeriesScope): Promise<void> {
  const supabase = await createClient();
  const selection = await collectSeriesIds(supabase, target, scope);
  if (!selection) {
    revalidatePath("/schedule");
    return;
  }

  if (selection.ids.length) {
    const { data, error } = await supabase
      .from("lesson")
      .update({ status: "canceled" })
      .in("id", selection.ids)
      .eq("status", "scheduled")
      .select("id");
    if (error) throw new Error(error.message);

    const canceledCount = data?.length ?? 0;
    if (canceledCount > 0) {
      await notifyStudentByTelegram({
        studentId: selection.studentId,
        event: "lesson_canceled",
        logLabel: "series canceled notification",
        build: ({ url }) =>
          lessonChangedMessage({ kind: "canceledMany", count: canceledCount, url }),
      });
    }
  }
  revalidateLesson(selection.studentId);
}

/** Delete one / this-and-future / all lessons of a series (never a charged one). */
export async function deleteSeriesAction(target: SeriesTarget, scope: SeriesScope): Promise<void> {
  const supabase = await createClient();
  const selection = await collectSeriesIds(supabase, target, scope);
  if (!selection) {
    revalidatePath("/schedule");
    return;
  }

  if (selection.ids.length) {
    const { error } = await supabase
      .from("lesson")
      .delete()
      .in("id", selection.ids)
      .in("status", ["scheduled", "canceled"]);
    if (error) throw new Error(error.message);
  }
  revalidateLesson(selection.studentId);
}
