import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { listLessonHistory, listUpcomingLessons, type Lesson } from "@/features/lessons/queries";
import { listPayments, type Payment } from "@/features/payments/queries";
import { getCurrentTutor } from "@/lib/auth";
import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "@/lib/currency";
import { pickNextLesson, sumPaid } from "./overview";

export type Student = Database["public"]["Tables"]["student"]["Row"];

/** All of the current tutor's students (RLS scopes to the owner). */
export async function listStudents(): Promise<Student[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** A single student by id, or null if not found / not owned. */
export async function getStudent(id: string): Promise<Student | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("student").select("*").eq("id", id).maybeSingle();
  return data;
}

/** Lightweight {id, name} list for pickers (e.g. the schedule's lesson form). */
export async function listStudentOptions(): Promise<Pick<Student, "id" | "name">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student")
    .select("id, name")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Counts for the card's tab badges, fetched on every card load. Cheap
 * head-only COUNT queries: upcoming (still-`scheduled`, future) lessons and
 * homework awaiting review (`submitted`). RLS scopes to the owner.
 */
export async function getStudentTabCounts(
  id: string,
): Promise<{ upcoming: number; homeworkToReview: number }> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [upcoming, toReview] = await Promise.all([
    supabase
      .from("lesson")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id)
      .eq("status", "scheduled")
      .gte("starts_at", nowIso),
    supabase
      .from("homework")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id)
      .eq("status", "submitted"),
  ]);

  if (upcoming.error) throw new Error(upcoming.error.message);
  if (toReview.error) throw new Error(toReview.error.message);
  return { upcoming: upcoming.count ?? 0, homeworkToReview: toReview.count ?? 0 };
}

/** Everything the overview tab summarizes, in one place. */
export interface StudentOverview {
  nextLesson: Lesson | null;
  totalPaid: number;
  recentLessons: Lesson[];
  lastPayment: Payment | null;
  currency: CurrencyCode;
  /** Count of unsubmitted homework past its deadline (drives the attention zone). */
  homeworkOverdue: number;
}

/**
 * Per-student summary for the overview tab: nearest lesson, total paid, the
 * latest payment and a few recent lessons (for the activity feed), plus the
 * tutor's currency. All underlying queries run in parallel and are RLS-scoped.
 */
export async function getStudentOverview(id: string): Promise<StudentOverview> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [upcoming, payments, recentLessons, tutor, overdue] = await Promise.all([
    listUpcomingLessons(id),
    listPayments(id),
    listLessonHistory(id, 3),
    getCurrentTutor(),
    // Cheap head-only COUNT: unsubmitted homework whose deadline has passed.
    // `assigned` only → never overlaps the `submitted` "to review" count (INV-A-1).
    supabase
      .from("homework")
      .select("*", { count: "exact", head: true })
      .eq("student_id", id)
      .eq("status", "assigned")
      .not("due_at", "is", null)
      .lt("due_at", nowIso),
  ]);

  if (overdue.error) throw new Error(overdue.error.message);

  return {
    nextLesson: pickNextLesson(upcoming),
    totalPaid: sumPaid(payments),
    recentLessons,
    lastPayment: payments[0] ?? null,
    currency: isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY,
    homeworkOverdue: overdue.count ?? 0,
  };
}
