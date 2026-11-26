import { cache } from "react";
import { listStudentOptions } from "@/features/students/queries";
import { getCurrentTutor } from "@/lib/auth";
import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import type { HomeworkRow } from "@/features/homework/queries";
import type { Lesson, LessonWithStudent } from "@/features/lessons/queries";
import type { HomeworkInboxItem } from "./queries";

/**
 * Shared dashboard data, deduped per request via React `cache()`. Several card
 * loaders need the student list / name map; `cache()` makes the underlying
 * query run exactly once per render, no matter how many loaders call it — so
 * splitting the old single aggregator into per-card loaders does NOT multiply
 * DB round-trips.
 */
export const getStudentOptions = cache(() => listStudentOptions());

export const getStudentNameMap = cache(async (): Promise<Map<string, string>> => {
  const students = await getStudentOptions();
  return new Map(students.map((s) => [s.id, s.name]));
});

/** Tutor's display currency, falling back to the default. Deduped per request. */
export const getDashboardCurrency = cache(async (): Promise<CurrencyCode> => {
  const tutor = await getCurrentTutor();
  return isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY;
});

/** Attach a student name to a lesson from the shared name map (no extra query). */
export function withStudent(lesson: Lesson, names: Map<string, string>): LessonWithStudent {
  return { ...lesson, student: { name: names.get(lesson.student_id) ?? "—" } };
}

/** Reduce a homework row to an inbox item, with the student name merged in. */
export function toInboxItem(hw: HomeworkRow, names: Map<string, string>): HomeworkInboxItem {
  return {
    id: hw.id,
    student_id: hw.student_id,
    title: hw.title,
    status: hw.status,
    due_at: hw.due_at,
    studentName: names.get(hw.student_id) ?? "—",
  };
}
