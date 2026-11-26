"use server";

import { redirect } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { DEFAULT_APP_REDIRECT, safePostLoginRedirect } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { resetPasswordSchema, signInSchema, signUpSchema } from "./schema";

export interface AuthState {
  error?: string;
  message?: string;
  /** Ошибки конкретных полей формы (email/password/…) для инлайн-показа. */
  fieldErrors?: Record<string, string>;
  /**
   * Введённые значения нечувствительных полей (имя/email). React 19 после сабмита
   * сбрасывает неуправляемые поля формы — возвращаем их, чтобы при ошибке заполнить
   * поля заново через defaultValue. Пароли намеренно не возвращаем.
   */
  values?: { name?: string; email?: string };
}

/** Безопасно достаёт строковое значение поля формы (или undefined). */
function str(value: FormDataEntryValue | null): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Первое сообщение по каждому полю из Zod-ошибки. */
function toFieldErrors(fieldErrors: Record<string, string[] | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

/** Маппинг ошибок Supabase в дружелюбные русские тексты. */
function mapSignUpError(error: AuthError): AuthState {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();
  if (code === "user_already_exists" || msg.includes("already registered")) {
    return { fieldErrors: { email: t.auth.emailTaken } };
  }
  if (code === "weak_password" || msg.includes("password")) {
    return { fieldErrors: { password: t.auth.weakPassword } };
  }
  return { error: t.common.errorTitle };
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = { email: str(formData.get("email")) };
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors), values };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: t.auth.invalidCredentials, values };
  }

  // Явный redirectTo (deep-link) имеет приоритет; иначе админ → /admin,
  // репетитор → /students.
  const explicit = safePostLoginRedirect(formData.get("redirectTo"));
  if (explicit) {
    redirect(explicit);
  }
  const { data: isAdmin } = await supabase.rpc("is_admin");
  redirect(isAdmin === true ? "/admin" : DEFAULT_APP_REDIRECT);
}

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const values = { name: str(formData.get("name")), email: str(formData.get("email")) };
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors), values };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });
  if (error) {
    return { ...mapSignUpError(error), values };
  }

  // Если подтверждение email выключено (рекомендуется для MVP — см. docs/SETUP.md),
  // сессия возвращается сразу и можно идти внутрь.
  if (data.session) {
    redirect(safePostLoginRedirect(formData.get("redirectTo")) ?? DEFAULT_APP_REDIRECT);
  }

  return { message: t.auth.checkEmail };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Установить новый пароль. Вызывается со страницы /reset-password, куда пользователь
 * попал по ссылке из письма — к этому моменту /auth/confirm уже обменял token_hash
 * на recovery-сессию, поэтому updateUser применяется к нужному аккаунту.
 */
export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t.auth.reset.linkInvalid };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "weak_password") {
      return { fieldErrors: { password: t.auth.weakPassword } };
    }
    return { error: t.common.errorTitle };
  }

  // Закрываем recovery-сессию: пусть войдёт новым паролем заново.
  await supabase.auth.signOut();
  redirect("/login");
}
