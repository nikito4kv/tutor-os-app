"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ONBOARDING_SIGNUP_START_STORAGE_KEY } from "@/features/onboarding/constants";
import { EMAIL_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { signInAction, signUpAction, type AuthState } from "./actions";
import { TextField } from "./auth-field";
import { PasswordField } from "./password-input";
import { PasswordStrength } from "./password-strength";

type Mode = "signin" | "signup";

const initialState: AuthState = {};

export function AuthForm({ mode, redirectTo }: { mode: Mode; redirectTo?: string }) {
  const isSignUp = mode === "signup";
  const action = isSignUp ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const fieldErrors = useMemo(() => state.fieldErrors ?? {}, [state.fieldErrors]);

  // После сабмита React сбрасывает uncontrolled-поля формы — синхронизируем зеркала
  // значений, иначе индикатор силы и проверка совпадения держат прежний (стёртый) ввод.
  useEffect(() => {
    setPassword("");
    setConfirmPassword("");
  }, [state]);

  useEffect(() => {
    if (!isSignUp || (!state.error && Object.keys(fieldErrors).length === 0)) return;
    window.localStorage.removeItem(ONBOARDING_SIGNUP_START_STORAGE_KEY);
  }, [fieldErrors, isSignUp, state.error]);

  // Живая проверка совпадения: показываем ошибку и блокируем кнопку, как только
  // в подтверждении что-то введено и оно расходится с паролем.
  const passwordsMismatch = isSignUp && confirmPassword.length > 0 && password !== confirmPassword;
  const confirmError = passwordsMismatch ? t.auth.passwordsDontMatch : fieldErrors.confirmPassword;

  // Сохраняем redirect при переключении вход↔регистрация.
  const switchHref = (path: string) =>
    redirectTo ? `${path}?redirect=${encodeURIComponent(redirectTo)}` : path;

  function handleSubmit() {
    if (isSignUp) {
      window.localStorage.setItem(ONBOARDING_SIGNUP_START_STORAGE_KEY, "1");
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="space-y-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="size-3.5" />
          {isSignUp ? t.auth.signUpBadge : t.auth.signInBadge}
        </span>
        <div className="space-y-1.5">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isSignUp ? t.auth.signUpTitle : t.auth.signInTitle}
          </CardTitle>
          <CardDescription>
            {isSignUp ? t.auth.signUpSubtitle : t.auth.signInSubtitle}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
          {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

          {isSignUp ? (
            <TextField
              id="name"
              label={t.auth.name}
              autoComplete="name"
              placeholder={t.auth.namePlaceholder}
              required
              autoFocus
              maxLength={SHORT_TEXT_MAX}
              defaultValue={state.values?.name ?? ""}
              error={fieldErrors.name}
            />
          ) : null}

          <TextField
            id="email"
            label={t.auth.email}
            type="email"
            autoComplete="email"
            required
            autoFocus={!isSignUp}
            maxLength={EMAIL_MAX}
            defaultValue={state.values?.email ?? ""}
            error={fieldErrors.email}
          />

          <div className="space-y-2">
            <PasswordField
              id="password"
              label={t.auth.password}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              error={fieldErrors.password}
              onValueChange={isSignUp ? setPassword : undefined}
              onFocusChange={isSignUp ? setPasswordFocused : undefined}
            />
            {isSignUp ? <PasswordStrength value={password} show={passwordFocused} /> : null}
          </div>

          {isSignUp ? (
            <PasswordField
              id="confirmPassword"
              label={t.auth.confirmPassword}
              autoComplete="new-password"
              required
              error={confirmError}
              onValueChange={setConfirmPassword}
            />
          ) : null}

          {state.error ? (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          ) : null}
          {state.message ? (
            <p
              role="status"
              className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground"
            >
              {state.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending || passwordsMismatch}>
            {pending ? (
              <>
                <Loader2 className="animate-spin" />
                {t.common.loading}
              </>
            ) : isSignUp ? (
              t.auth.signUp
            ) : (
              t.auth.signIn
            )}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          <Link
            href={isSignUp ? switchHref("/login") : switchHref("/signup")}
            className="transition-colors hover:text-foreground"
          >
            {isSignUp ? t.auth.toSignIn : t.auth.toSignUp}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
