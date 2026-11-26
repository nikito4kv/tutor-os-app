import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedbackFilter } from "./schema";

export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export interface AdminStats {
  tutors: number;
  students: number;
  lessons: number;
  feedback_new: number;
  // Дельты за 7 дней (по created_at).
  tutors_new_7d: number;
  students_new_7d: number;
  // Уроки по статусам (синхр. со схемой lesson: scheduled|done|canceled|no_show).
  lessons_scheduled: number;
  lessons_done: number;
  lessons_canceled: number;
  lessons_no_show: number;
  lessons_done_7d: number;
  // Сигналы активации/оттока (по-прежнему агрегаты, не строки).
  tutors_no_students: number;
  tutors_inactive_30d: number;
}

export interface AdminTutor {
  id: string;
  name: string;
  email: string;
  currency: string;
  created_at: string;
  students_count: number;
  lessons_count: number;
}

export interface AdminStudent {
  id: string;
  name: string;
  contact: string | null;
  parent_contact: string | null;
  subject: string | null;
  level: string | null;
  created_at: string;
  tutor_id: string;
  tutor_name: string;
  tutor_email: string;
  lessons_count: number;
  homework_count: number;
}

type TutorRow = Pick<
  Database["public"]["Tables"]["tutor"]["Row"],
  "id" | "name" | "email" | "currency" | "created_at"
>;

type StudentRow = Pick<
  Database["public"]["Tables"]["student"]["Row"],
  "id" | "tutor_id" | "name" | "contact" | "parent_contact" | "subject" | "level" | "created_at"
>;

type LessonStudentRef = Pick<Database["public"]["Tables"]["lesson"]["Row"], "student_id">;

type LessonStatusRef = Pick<Database["public"]["Tables"]["lesson"]["Row"], "student_id" | "status">;

type HomeworkStudentRef = Pick<Database["public"]["Tables"]["homework"]["Row"], "student_id">;

function countBy<T>(items: readonly T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * Aggregate counts for the admin dashboard. The `admin_stats()` RPC gates on
 * `is_admin()` and raises `forbidden` for non-admins, so this never leaks counts.
 */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) {
    throw new Error(error.message);
  }
  // RPC returns Json (like complete_lesson); the function's shape is fixed above.
  return data as unknown as AdminStats;
}

/**
 * Feedback inbox, newest first. RLS (`feedback_select_admin`) lets an admin read
 * every row; a non-admin sees nothing here.
 */
export async function listFeedback(filter: FeedbackFilter = "all"): Promise<Feedback[]> {
  const supabase = await createClient();
  let query = supabase.from("feedback").select("*").order("created_at", { ascending: false });
  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * Read-only admin directory of tutors, newest first. This runs only after the
 * admin gate and keeps the service-role projection narrow.
 */
export async function listAdminTutors(): Promise<AdminTutor[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const [{ data: tutors, error: tutorsError }, { data: students, error: studentsError }] =
    await Promise.all([
      supabase
        .from("tutor")
        .select("id, name, email, currency, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("student").select("id, tutor_id"),
    ]);

  if (tutorsError) throw new Error(tutorsError.message);
  if (studentsError) throw new Error(studentsError.message);

  const studentRows = (students ?? []) as Pick<StudentRow, "id" | "tutor_id">[];
  const studentTutorById = new Map(studentRows.map((student) => [student.id, student.tutor_id]));
  const studentCounts = countBy(studentRows, (student) => student.tutor_id);

  const { data: lessons, error: lessonsError } = await supabase.from("lesson").select("student_id");
  if (lessonsError) throw new Error(lessonsError.message);

  const lessonCounts = new Map<string, number>();
  for (const lesson of (lessons ?? []) as LessonStudentRef[]) {
    const tutorId = studentTutorById.get(lesson.student_id);
    if (tutorId) {
      lessonCounts.set(tutorId, (lessonCounts.get(tutorId) ?? 0) + 1);
    }
  }

  return ((tutors ?? []) as TutorRow[]).map((tutor) => ({
    id: tutor.id,
    name: tutor.name,
    email: tutor.email,
    currency: tutor.currency,
    created_at: tutor.created_at,
    students_count: studentCounts.get(tutor.id) ?? 0,
    lessons_count: lessonCounts.get(tutor.id) ?? 0,
  }));
}

/**
 * Read-only admin directory of students, newest first. Includes tutor context
 * so the admin can understand where each student came from.
 */
export async function listAdminStudents(): Promise<AdminStudent[]> {
  await assertAdmin();
  const supabase = createAdminClient();
  const [
    { data: students, error: studentsError },
    { data: tutors, error: tutorsError },
    { data: lessons, error: lessonsError },
    { data: homework, error: homeworkError },
  ] = await Promise.all([
    supabase
      .from("student")
      .select("id, tutor_id, name, contact, parent_contact, subject, level, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("tutor").select("id, name, email"),
    supabase.from("lesson").select("student_id"),
    supabase.from("homework").select("student_id"),
  ]);

  if (studentsError) throw new Error(studentsError.message);
  if (tutorsError) throw new Error(tutorsError.message);
  if (lessonsError) throw new Error(lessonsError.message);
  if (homeworkError) throw new Error(homeworkError.message);

  const tutorById = new Map(
    ((tutors ?? []) as Pick<TutorRow, "id" | "name" | "email">[]).map((tutor) => [tutor.id, tutor]),
  );
  const lessonCounts = countBy(
    (lessons ?? []) as LessonStudentRef[],
    (lesson) => lesson.student_id,
  );
  const homeworkCounts = countBy(
    (homework ?? []) as HomeworkStudentRef[],
    (item) => item.student_id,
  );

  return ((students ?? []) as StudentRow[]).map((student) => {
    const tutor = tutorById.get(student.tutor_id);
    return {
      id: student.id,
      name: student.name,
      contact: student.contact,
      parent_contact: student.parent_contact,
      subject: student.subject,
      level: student.level,
      created_at: student.created_at,
      tutor_id: student.tutor_id,
      tutor_name: tutor?.name ?? "",
      tutor_email: tutor?.email ?? "",
      lessons_count: lessonCounts.get(student.id) ?? 0,
      homework_count: homeworkCounts.get(student.id) ?? 0,
    };
  });
}

export interface TutorAnalytics {
  students: number;
  lessonsTotal: number;
  lessonsScheduled: number;
  lessonsDone: number;
  lessonsCanceled: number;
  lessonsNoShow: number;
  /** Сумма всех оплат учеников репетитора (в его валюте). */
  income: number;
}

export interface AdminTutorDetail {
  tutor: AdminTutor;
  analytics: TutorAnalytics;
  students: AdminStudent[];
}

/**
 * One tutor's profile plus their students (with per-student counts), for the
 * admin tutor page. Runs only after the admin gate; returns null if not found.
 */
export async function getAdminTutorDetail(tutorId: string): Promise<AdminTutorDetail | null> {
  await assertAdmin();
  const supabase = createAdminClient();

  const { data: tutorRow, error: tutorError } = await supabase
    .from("tutor")
    .select("id, name, email, currency, created_at")
    .eq("id", tutorId)
    .maybeSingle();
  if (tutorError) throw new Error(tutorError.message);
  if (!tutorRow) return null;
  const tutor = tutorRow as TutorRow;

  const { data: students, error: studentsError } = await supabase
    .from("student")
    .select("id, tutor_id, name, contact, parent_contact, subject, level, created_at")
    .eq("tutor_id", tutorId)
    .order("created_at", { ascending: false });
  if (studentsError) throw new Error(studentsError.message);
  const studentRows = (students ?? []) as StudentRow[];
  const studentIds = studentRows.map((student) => student.id);

  // Skip the child queries entirely when the tutor has no students (an empty
  // `.in([])` errors in PostgREST).
  let lessonCounts = new Map<string, number>();
  let homeworkCounts = new Map<string, number>();
  const lessonsByStatus = { scheduled: 0, done: 0, canceled: 0, no_show: 0 };
  let lessonsTotal = 0;
  let income = 0;
  if (studentIds.length > 0) {
    const [
      { data: lessons, error: lessonsError },
      { data: homework, error: homeworkError },
      { data: payments, error: paymentsError },
    ] = await Promise.all([
      supabase.from("lesson").select("student_id, status").in("student_id", studentIds),
      supabase.from("homework").select("student_id").in("student_id", studentIds),
      supabase.from("payment").select("amount").in("student_id", studentIds),
    ]);
    if (lessonsError) throw new Error(lessonsError.message);
    if (homeworkError) throw new Error(homeworkError.message);
    if (paymentsError) throw new Error(paymentsError.message);

    const lessonRows = (lessons ?? []) as LessonStatusRef[];
    lessonsTotal = lessonRows.length;
    lessonCounts = countBy(lessonRows, (lesson) => lesson.student_id);
    for (const lesson of lessonRows) {
      if (lesson.status in lessonsByStatus) {
        lessonsByStatus[lesson.status as keyof typeof lessonsByStatus] += 1;
      }
    }
    homeworkCounts = countBy((homework ?? []) as HomeworkStudentRef[], (item) => item.student_id);
    income = ((payments ?? []) as { amount: number }[]).reduce((sum, p) => sum + p.amount, 0);
  }

  return {
    tutor: {
      id: tutor.id,
      name: tutor.name,
      email: tutor.email,
      currency: tutor.currency,
      created_at: tutor.created_at,
      students_count: studentRows.length,
      lessons_count: lessonsTotal,
    },
    analytics: {
      students: studentRows.length,
      lessonsTotal,
      lessonsScheduled: lessonsByStatus.scheduled,
      lessonsDone: lessonsByStatus.done,
      lessonsCanceled: lessonsByStatus.canceled,
      lessonsNoShow: lessonsByStatus.no_show,
      income,
    },
    students: studentRows.map((student) => ({
      id: student.id,
      name: student.name,
      contact: student.contact,
      parent_contact: student.parent_contact,
      subject: student.subject,
      level: student.level,
      created_at: student.created_at,
      tutor_id: student.tutor_id,
      tutor_name: tutor.name,
      tutor_email: tutor.email,
      lessons_count: lessonCounts.get(student.id) ?? 0,
      homework_count: homeworkCounts.get(student.id) ?? 0,
    })),
  };
}
