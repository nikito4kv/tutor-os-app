"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AuthError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTutor } from "@/lib/auth";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "@/lib/currency";
import { signUpPassword } from "@/features/auth/schema";
import { SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(SHORT_TEXT_MAX),
  currency: z.enum(SUPPORTED_CURRENCIES),
});

export interface SettingsState {
  error?: string;
  currency?: CurrencyCode;
  name?: string;
  saved?: boolean;
  savedVersion?: number;
}

export async function updateSettingsAction(
  prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const tutor = await getCurrentTutor();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tutor")
    .update({ name: parsed.data.name, currency: parsed.data.currency })
    .eq("id", tutor.id);

  if (error) {
    return { error: error.message };
  }

  // Валюта влияет на денежное форматирование во всём приложении (карточки учеников,
  // оплаты), а не только на странице настроек — сбрасываем кэш всего дерева.
  revalidatePath("/", "layout");
  return {
    currency: parsed.data.currency,
    name: parsed.data.name,
    saved: true,
    savedVersion: (prev.savedVersion ?? 0) + 1,
  };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, t.auth.passwordRequired),
    newPassword: signUpPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: t.auth.passwordsDontMatch,
    path: ["confirmPassword"],
  });

export interface ChangePasswordState {
  error?: string;
  /** Ошибки конкретных полей (currentPassword/newPassword/confirmPassword). */
  fieldErrors?: Record<string, string>;
  saved?: boolean;
}

/** Первое сообщение по каждому полю из Zod-ошибки. */
function toFieldErrors(fieldErrors: Record<string, string[] | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, messages] of Object.entries(fieldErrors)) {
    if (messages?.[0]) result[key] = messages[0];
  }
  return result;
}

/** Маппинг ошибок Supabase при смене пароля в дружелюбные русские тексты. */
function mapUpdatePasswordError(error: AuthError): ChangePasswordState {
  const code = error.code ?? "";
  const msg = error.message.toLowerCase();
  if (code === "same_password" || msg.includes("should be different")) {
    return { fieldErrors: { newPassword: t.settings.newPasswordSameAsOld } };
  }
  if (code === "weak_password" || msg.includes("password")) {
    return { fieldErrors: { newPassword: t.auth.weakPassword } };
  }
  return { error: t.common.errorTitle };
}

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const tutor = await getCurrentTutor();
  const supabase = await createClient();

  // Проверяем текущий пароль повторной аутентификацией: защищает от смены пароля
  // при чужой открытой сессии (за чужим компьютером).
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: tutor.email,
    password: parsed.data.currentPassword,
  });
  if (reauthError) {
    return { fieldErrors: { currentPassword: t.settings.currentPasswordWrong } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (error) {
    return mapUpdatePasswordError(error);
  }

  return { saved: true };
}
