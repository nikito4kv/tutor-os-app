"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertAdmin, getIsAdmin } from "@/lib/auth";
import { env } from "@/lib/config";
import { t } from "@/lib/i18n";
import {
  feedbackStatusSchema,
  parseTutorEmailForm,
  parseTutorProfileForm,
  type FeedbackStatus,
} from "./schema";

/**
 * Triage a feedback item's status (new/seen/closed). RLS (`feedback_update_admin`)
 * already gates the write; the explicit admin check turns a silent "0 rows" into
 * a friendly error. Called directly (not via form action) from a `useOptimistic`
 * transition, so the select never flashes the old status.
 */
export async function setFeedbackStatusAction(
  feedbackId: string,
  status: FeedbackStatus,
): Promise<{ error?: string }> {
  if (!(await getIsAdmin())) {
    return { error: t.admin.forbidden };
  }

  const parsed = feedbackStatusSchema.safeParse({ status });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ status: parsed.data.status })
    .eq("id", feedbackId);
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/feedback");
  revalidatePath("/admin"); // обновить счётчик feedback_new на дашборде
  return {};
}

// ---------------------------------------------------------------------------
// Управление аккаунтом репетитора (служебное, только для админа).
// Все действия идут через service-role клиент (BYPASS RLS) и обязательно за
// `assertAdmin()`. Источник правды по схеме — миграции; новых таблиц не вводим.
// ---------------------------------------------------------------------------

export interface AdminFormState {
  error?: string;
}

/** Обновить имя и валюту репетитора в таблице tutor. */
export async function updateTutorProfileAction(
  tutorId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await assertAdmin();
  const parsed = parseTutorProfileForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("tutor").update(parsed.data).eq("id", tutorId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/users/${tutorId}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${tutorId}`);
}

/** Сменить email репетитора: и логин в auth.users, и поле tutor.email. */
export async function updateTutorEmailAction(
  tutorId: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await assertAdmin();
  const parsed = parseTutorEmailForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createAdminClient();
  const { error: authError } = await supabase.auth.admin.updateUserById(tutorId, {
    email: parsed.data.email,
    email_confirm: true, // админ меняет напрямую — без письма-подтверждения
  });
  if (authError) {
    return {
      error: authError.code === "email_exists" ? t.auth.emailTaken : authError.message,
    };
  }

  const { error } = await supabase
    .from("tutor")
    .update({ email: parsed.data.email })
    .eq("id", tutorId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/users/${tutorId}`);
  revalidatePath("/admin/users");
  redirect(`/admin/users/${tutorId}`);
}

/**
 * Отправить репетитору письмо со ссылкой для сброса пароля. Используем встроенную
 * почту Supabase (recovery). Ссылка ведёт на /auth/confirm → verifyOtp, поэтому
 * работает в любом браузере (token_hash самодостаточен, без PKCE-verifier).
 */
export async function sendTutorPasswordResetAction(
  email: string,
): Promise<{ ok?: boolean; error?: string }> {
  if (!(await getIsAdmin())) return { error: t.admin.forbidden };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/auth/confirm?next=/reset-password`,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

/** Полностью удалить репетитора: deleteUser каскадит на tutor → student → … */
export async function deleteTutorAction(tutorId: string): Promise<{ error?: string }> {
  if (!(await getIsAdmin())) return { error: t.admin.forbidden };

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(tutorId);
  if (error) return { error: error.message };

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  redirect("/admin/users");
}
