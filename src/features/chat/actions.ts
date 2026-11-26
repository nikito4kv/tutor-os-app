"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentTutor } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { isMissingChatTableError } from "./errors";
import { readOptionalChatFile, uploadChatFile } from "./files";
import { parseChatMessageForm } from "./schema";

export interface ChatFormState {
  error?: string;
  sentAt?: number;
}

function readAttachment(formData: FormData): File | null | string {
  try {
    return readOptionalChatFile(formData);
  } catch (error) {
    return error instanceof Error ? error.message : t.chat.fileReadError;
  }
}

function isStorageSetupError(error: unknown) {
  return error instanceof Error && /bucket|storage/i.test(error.message);
}

export async function sendTutorChatMessageAction(
  studentId: string,
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  const parsed = parseChatMessageForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.chat.validationError };
  }

  const file = readAttachment(formData);
  if (typeof file === "string") return { error: file };
  if (parsed.data.body.length === 0 && !file) return { error: t.chat.emptyMessageError };

  const supabase = await createClient();
  const { data: student, error: studentError } = await supabase
    .from("student")
    .select("share_token")
    .eq("id", studentId)
    .maybeSingle();

  if (studentError) return { error: studentError.message };
  if (!student) return { error: t.chat.studentNotFound };

  const messageId = randomUUID();
  let attachmentPath: string | null = null;
  if (file) {
    try {
      attachmentPath = await uploadChatFile({ supabase, studentId, messageId, file });
    } catch (error) {
      return {
        error: isStorageSetupError(error)
          ? t.chat.setupRequired
          : error instanceof Error
            ? error.message
            : t.chat.fileUploadError,
      };
    }
  }

  const { error } = await supabase.from("chat_message").insert({
    id: messageId,
    student_id: studentId,
    sender: "tutor",
    body: parsed.data.body,
    attachment_path: attachmentPath,
    attachment_name: file?.name ?? null,
    attachment_type: file?.type || null,
    attachment_size: file?.size ?? null,
  });

  if (error) {
    return { error: isMissingChatTableError(error) ? t.chat.setupRequired : error.message };
  }

  revalidatePath("/messages");
  revalidatePath(`/students/${studentId}`);
  if (student.share_token) revalidatePath(`/s/${student.share_token}`);
  return { sentAt: Date.now() };
}

export async function sendStudentChatMessageAction(
  token: string,
  _prev: ChatFormState,
  formData: FormData,
): Promise<ChatFormState> {
  const parsed = parseChatMessageForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.chat.validationError };
  }

  const file = readAttachment(formData);
  if (typeof file === "string") return { error: file };
  if (parsed.data.body.length === 0 && !file) return { error: t.chat.emptyMessageError };

  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("student")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();

  if (!student) return { error: t.chat.linkInvalid };

  const messageId = randomUUID();
  let attachmentPath: string | null = null;
  if (file) {
    try {
      attachmentPath = await uploadChatFile({ supabase, studentId: student.id, messageId, file });
    } catch (error) {
      return {
        error: isStorageSetupError(error)
          ? t.chat.setupRequired
          : error instanceof Error
            ? error.message
            : t.chat.fileUploadError,
      };
    }
  }

  const { error } = await supabase.from("chat_message").insert({
    id: messageId,
    student_id: student.id,
    sender: "student",
    body: parsed.data.body,
    attachment_path: attachmentPath,
    attachment_name: file?.name ?? null,
    attachment_type: file?.type || null,
    attachment_size: file?.size ?? null,
  });

  if (error) {
    return { error: isMissingChatTableError(error) ? t.chat.setupRequired : error.message };
  }

  revalidatePath(`/s/${token}`);
  revalidatePath(`/students/${student.id}`);
  revalidatePath("/messages");
  return { sentAt: Date.now() };
}

export async function markTutorChatReadAction(studentId: string): Promise<void> {
  const tutor = await getCurrentTutor();
  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("student")
    .select("id")
    .eq("id", studentId)
    .eq("tutor_id", tutor.id)
    .maybeSingle();

  if (!student) return;

  await supabase
    .from("chat_message")
    .update({ read_at: new Date().toISOString() })
    .eq("student_id", studentId)
    .eq("sender", "student")
    .is("read_at", null);

  revalidatePath("/messages");
  revalidatePath(`/students/${studentId}`);
}

export async function markStudentChatReadAction(token: string): Promise<void> {
  const supabase = createAdminClient();
  const { data: student } = await supabase
    .from("student")
    .select("id")
    .eq("share_token", token)
    .maybeSingle();

  if (!student) return;

  await supabase
    .from("chat_message")
    .update({ read_at: new Date().toISOString() })
    .eq("student_id", student.id)
    .eq("sender", "tutor")
    .is("read_at", null);

  revalidatePath(`/s/${token}`);
  revalidatePath(`/students/${student.id}`);
  revalidatePath("/messages");
}
