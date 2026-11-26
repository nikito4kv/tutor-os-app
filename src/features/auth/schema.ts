import { z } from "zod";
import { EMAIL_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";

/** Минимальная длина пароля при регистрации (синхронизировано с политикой Supabase). */
export const PASSWORD_MIN = 8;

/**
 * Набор спецсимволов совпадает с тем, что принимает Supabase Auth при политике
 * «lower_upper_letters_digits_symbols», поэтому пароль, проходящий нашу проверку,
 * принимается и сервером.
 */
const SYMBOL_RE = /[!@#$%^&*()_+\-=[\]{};'\\:"|<>?,./`~]/;

/**
 * Единый источник правды по требованиям к паролю: используется и в Zod-схеме
 * (серверная проверка), и в live-чеклисте на клиенте. Все правила обязательны и
 * соответствуют политике пароля Supabase (буквы обоих регистров + цифра + символ).
 */
export const PASSWORD_RULES = [
  { id: "length", required: true, test: (v: string) => v.length >= PASSWORD_MIN },
  { id: "lower", required: true, test: (v: string) => /[a-z]/.test(v) },
  { id: "upper", required: true, test: (v: string) => /[A-Z]/.test(v) },
  { id: "digit", required: true, test: (v: string) => /[0-9]/.test(v) },
  { id: "special", required: true, test: (v: string) => SYMBOL_RE.test(v) },
] as const;

export type PasswordRuleId = (typeof PASSWORD_RULES)[number]["id"];

/** email нормализуется (trim + lowercase), чтобы не плодить дубли-аккаунты. */
const email = z.string().trim().toLowerCase().email(t.auth.emailInvalid).max(EMAIL_MAX);

export const signInSchema = z.object({
  email,
  // На входе политику не навязываем (есть пользователи со старыми паролями).
  password: z.string().min(1, t.auth.passwordRequired),
});

export const signUpPassword = z.string().superRefine((val, ctx) => {
  for (const rule of PASSWORD_RULES) {
    if (rule.required && !rule.test(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: t.auth.passwordRules[rule.id] });
      break; // показываем по одному требованию за раз
    }
  }
});

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, t.auth.nameRequired).max(SHORT_TEXT_MAX),
    email,
    password: signUpPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t.auth.passwordsDontMatch,
    path: ["confirmPassword"],
  });

/** Установка нового пароля по ссылке из письма (recovery-сессия уже активна). */
export const resetPasswordSchema = z
  .object({
    password: signUpPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: t.auth.passwordsDontMatch,
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
