import { createClient } from "@/lib/supabase/server";
import type { Database, HomeworkStatus } from "@/lib/supabase/database.types";
import { packageBalance } from "@/features/packages/balance";
import { STUDENT_HISTORY_LIMIT } from "@/lib/constants";

export type Lesson = Database["public"]["Tables"]["lesson"]["Row"];

/** A lesson joined with its student's name, for the schedule views. */
export type LessonWithStudent = Lesson & { student: { name: string } | null };

/** Everything the lesson-detail modal shows: the lesson + context around it. */
export interface LessonDetail {
  lesson: Lesson;
  studentName: string;
  lessonsLeft: number;
  homework: { id: string; title: string; status: HomeworkStatus }[];
}

/** Lesson + linked homework + current balance, for the detail modal. RLS scopes to owner. */
export async function getLessonDetail(lessonId: string): Promise<LessonDetail | null> {
  const supabase = await createClient();
  const { data: lesson, error } = await supabase
    .from("lesson")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!lesson) return null;

  const [studentRes, homeworkRes, packagesRes] = await Promise.all([
    supabase.from("student").select("name").eq("id", lesson.student_id).maybeSingle(),
    supabase
      .from("homework")
      .select("id, title, status")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: true }),
    supabase.from("package").select("lessons_left").eq("student_id", lesson.student_id),
  ]);

  return {
    lesson,
    studentName: studentRes.data?.name ?? "—",
    lessonsLeft: packageBalance(packagesRes.data ?? []),
    homework: homeworkRes.data ?? [],
  };
}

/** The nearest still-`scheduled` lesson from now on across all students, or null. RLS-scoped. */
export async function getNextLesson(): Promise<Lesson | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .select("*")
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Scheduled lessons whose start time has already passed — awaiting completion
 * ("time to finish"). Across all students, earliest first. RLS-scoped.
 */
export async function listOverdueLessons(): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .select("*")
    .eq("status", "scheduled")
    .lt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** Upcoming (still `scheduled`) lessons for a student, earliest first. RLS-scoped. */
export async function listUpcomingLessons(studentId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .select("*")
    .eq("student_id", studentId)
    .eq("status", "scheduled")
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** Terminal/past lessons (not `scheduled`), newest first, capped. RLS-scoped. */
export async function listLessonHistory(
  studentId: string,
  limit: number = STUDENT_HISTORY_LIMIT,
): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .select("*")
    .eq("student_id", studentId)
    .neq("status", "scheduled")
    .order("starts_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/** Nearest scheduled lessons for the homework due-lesson picker. RLS-scoped. */
export async function listLessonOptions(
  studentId: string,
  limit: number = STUDENT_HISTORY_LIMIT,
): Promise<Pick<Lesson, "id" | "starts_at" | "topic" | "status">[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .select("id, starts_at, topic, status")
    .eq("student_id", studentId)
    .eq("status", "scheduled")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Lessons starting within [fromISO, toISO). Used by the schedule page; the
 * student name is merged in there from the already-loaded students list, so we
 * keep this query embed-free (the generated types don't model the relation).
 * RLS scopes to the owner.
 */
export async function listLessonsInRange(fromISO: string, toISO: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson")
    .select("*")
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO)
    .order("starts_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
}
