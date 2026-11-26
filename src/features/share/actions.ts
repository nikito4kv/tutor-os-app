"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { readOptionalHomeworkFile, uploadHomeworkFile } from "@/features/homework/files";
import { parseHomeworkSubmissionForm } from "@/features/homework/schema";
import { notifyTutorByTelegram } from "@/lib/telegram/notify";
import { homeworkSubmittedMessage } from "@/lib/telegram/messages";

export interface ShareHomeworkFormState {
  ok?: boolean;
  error?: string;
}

export async function submitHomeworkAction(
  token: string,
  homeworkId: string,
  _prev: ShareHomeworkFormState,
  formData: FormData,
): Promise<ShareHomeworkFormState> {
  const parsed = parseHomeworkSubmissionForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  let file: File | null = null;
  try {
    file = readOptionalHomeworkFile(formData, "submission_file");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось прочитать файл" };
  }

  if (!parsed.data.submission_text && !file) {
    return { error: "Добавьте текст или файл ответа" };
  }

  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("student")
    .select("id, name, tutor_id")
    .eq("share_token", token)
    .maybeSingle();

  if (!student) {
    return { error: "Ссылка недействительна" };
  }

  const { data: homework } = await supabase
    .from("homework")
    .select("id, student_id, status, title")
    .eq("id", homeworkId)
    .eq("student_id", student.id)
    .maybeSingle();

  if (!homework) {
    return { error: "Домашка не найдена" };
  }

  if (homework.status === "reviewed") {
    return { error: "Домашка уже проверена" };
  }

  let submissionUrl: string | null = null;
  try {
    if (file) {
      submissionUrl = await uploadHomeworkFile({
        supabase,
        studentId: student.id,
        homeworkId,
        file,
        kind: "submission",
      });
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Не удалось загрузить файл" };
  }

  const update = {
    status: "submitted" as const,
    submission_text: parsed.data.submission_text,
    ...(submissionUrl ? { submission_url: submissionUrl } : {}),
  };

  const { error } = await supabase
    .from("homework")
    .update(update)
    .eq("id", homeworkId)
    .eq("student_id", student.id);

  if (error) {
    return { error: error.message };
  }

  // Let the tutor know there's something to review (best-effort) — only on the
  // first submission, so re-uploading an answer doesn't ping again.
  if (homework.status === "assigned") {
    await notifyTutorByTelegram({
      tutorId: student.tutor_id,
      event: "homework_submitted",
      logLabel: "homework submitted notification",
      build: ({ appUrl }) =>
        homeworkSubmittedMessage(student.name, homework.title, `${appUrl}/students/${student.id}`),
    });
  }

  revalidatePath(`/s/${token}`);
  return { ok: true };
}
