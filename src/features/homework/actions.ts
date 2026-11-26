"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createHomeworkFromForm } from "@/features/homework/create";
import { notifyStudentByTelegram } from "@/lib/telegram/notify";
import { homeworkReviewedMessage } from "@/lib/telegram/messages";
import { parseHomeworkForm, parseHomeworkReviewForm } from "./schema";

export interface HomeworkFormState {
  ok?: boolean;
  error?: string;
}

export async function createHomeworkAction(
  studentId: string,
  _prev: HomeworkFormState,
  formData: FormData,
): Promise<HomeworkFormState> {
  const parsed = parseHomeworkForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  const err = await createHomeworkFromForm({
    supabase,
    studentId,
    lessonId: parsed.data.lesson_id,
    title: parsed.data.title,
    description: parsed.data.description,
    formData,
  });
  if (err) {
    return { error: err };
  }

  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}

export async function reviewHomeworkAction(
  studentId: string,
  homeworkId: string,
  _prev: HomeworkFormState,
  formData: FormData,
): Promise<HomeworkFormState> {
  const parsed = parseHomeworkReviewForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  // Prior status decides whether this is a first review (notify) or an edit of an
  // already-reviewed homework (save the new comment, but don't re-ping the student).
  const { data: prior } = await supabase
    .from("homework")
    .select("status")
    .eq("id", homeworkId)
    .eq("student_id", studentId)
    .maybeSingle();

  const { data: updated, error } = await supabase
    .from("homework")
    .update({ status: "reviewed", feedback: parsed.data.feedback })
    .eq("id", homeworkId)
    .eq("student_id", studentId)
    .select("title")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (updated && prior?.status !== "reviewed") {
    await notifyStudentByTelegram({
      studentId,
      event: "homework_reviewed",
      logLabel: "homework reviewed notification",
      build: ({ url }) => homeworkReviewedMessage(updated.title, url),
    });
  }

  revalidatePath(`/students/${studentId}`);
  return { ok: true };
}
