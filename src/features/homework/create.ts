import "server-only";
import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { notifyStudentByEmail } from "@/lib/email/notify";
import { homeworkAssignedEmail } from "@/lib/email/templates";
import { notifyStudentByTelegram } from "@/lib/telegram/notify";
import { homeworkAssignedMessage } from "@/lib/telegram/messages";
import { readOptionalHomeworkFile, uploadHomeworkFile } from "./files";
import { parseHomeworkDueAt } from "./schema";

type Client = SupabaseClient<Database>;

/**
 * Insert one homework row (with optional attachment upload). Shared by the
 * standalone "add homework" action and the lesson-completion flow. Returns an
 * error message, or null on success. Not a Server Action (takes a client/File),
 * hence a plain server-only helper.
 */
export async function createHomeworkFromForm(opts: {
  supabase: Client;
  studentId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  formData: FormData;
  fileKey?: string;
}): Promise<string | null> {
  const {
    supabase,
    studentId,
    lessonId,
    title,
    description,
    formData,
    fileKey = "attachment",
  } = opts;

  let file: File | null = null;
  try {
    file = readOptionalHomeworkFile(formData, fileKey);
  } catch (error) {
    return error instanceof Error ? error.message : "Не удалось прочитать файл";
  }

  const homeworkId = randomUUID();
  let attachmentUrl: string | null = null;
  if (file) {
    try {
      attachmentUrl = await uploadHomeworkFile({
        supabase,
        studentId,
        homeworkId,
        file,
        kind: "assignment",
      });
    } catch (error) {
      return error instanceof Error ? error.message : "Не удалось загрузить файл";
    }
  }

  // Optional deadline — validated/coerced in the homework schema (datetime-local → ISO).
  const dueAt = parseHomeworkDueAt(formData.get("due_at"));

  const { error } = await supabase.from("homework").insert({
    id: homeworkId,
    student_id: studentId,
    lesson_id: lessonId,
    title,
    description,
    attachment_url: attachmentUrl,
    due_at: dueAt,
  });
  if (error) return error.message;

  // Best-effort heads-up to the student (only if they have an email contact);
  // never fails the assignment if the email can't be sent.
  await notifyStudentByEmail({
    supabase,
    studentId,
    logLabel: "homework notification",
    build: ({ name, url }) => homeworkAssignedEmail({ studentName: name, title, description, url }),
  });
  await notifyStudentByTelegram({
    studentId,
    event: "homework_assigned",
    logLabel: "homework notification",
    build: ({ url }) => homeworkAssignedMessage(title, url),
  });
  return null;
}
