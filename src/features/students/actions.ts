"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTutor } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { parseStudentForm } from "./schema";
import { buildShareToken, readablePartOf } from "./share-token";

export interface StudentFormState {
  error?: string;
}

const UNIQUE_VIOLATION = "23505";

export async function createStudentAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = parseStudentForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const { share_code, ...fields } = parsed.data;
  const tutor = await getCurrentTutor();
  const supabase = await createClient();

  const insert = (token: string | null) =>
    supabase
      .from("student")
      .insert({ ...fields, tutor_id: tutor.id, ...(token ? { share_token: token } : {}) })
      .select("id")
      .single();

  // A custom code carries its own random suffix, so collisions are near-zero;
  // retry once with a fresh suffix just in case before surfacing "taken".
  let res = await insert(buildShareToken(share_code));
  if (res.error?.code === UNIQUE_VIOLATION && share_code) {
    res = await insert(buildShareToken(share_code));
  }

  if (res.error || !res.data) {
    return {
      error:
        res.error?.code === UNIQUE_VIOLATION
          ? t.students.share.taken
          : (res.error?.message ?? "Не удалось создать ученика"),
    };
  }

  revalidatePath("/students");
  redirect(`/students/${res.data.id}`);
}

export async function updateStudentAction(
  studentId: string,
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  const parsed = parseStudentForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const { share_code, ...fields } = parsed.data;
  const supabase = await createClient();

  // Read the current token to diff the readable part: only regenerate when the
  // tutor actually changed the code (RLS scopes this to their own student).
  const { data: current } = await supabase
    .from("student")
    .select("share_token")
    .eq("id", studentId)
    .maybeSingle();
  const oldToken = current?.share_token ?? null;
  const codeChanged =
    share_code !== "" && oldToken !== null && share_code !== readablePartOf(oldToken);

  const apply = (token: string | null) =>
    supabase
      .from("student")
      .update({ ...fields, ...(token ? { share_token: token } : {}) })
      .eq("id", studentId);

  let newToken = codeChanged ? buildShareToken(share_code) : null;
  let res = await apply(newToken);
  if (res.error?.code === UNIQUE_VIOLATION && newToken) {
    newToken = buildShareToken(share_code);
    res = await apply(newToken);
  }

  if (res.error) {
    return {
      error: res.error.code === UNIQUE_VIOLATION ? t.students.share.taken : res.error.message,
    };
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  if (newToken && oldToken) {
    revalidatePath(`/s/${oldToken}`);
    revalidatePath(`/s/${newToken}`);
  }
  redirect(`/students/${studentId}`);
}

export async function deleteStudentAction(studentId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("student").delete().eq("id", studentId);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/students");
  redirect("/students");
}
