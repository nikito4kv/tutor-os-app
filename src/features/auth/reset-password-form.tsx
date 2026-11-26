"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import { updatePasswordAction, type AuthState } from "./actions";
import { PasswordField } from "./password-input";
import { PasswordStrength } from "./password-strength";

const initial: AuthState = {};

/** Форма установки нового пароля (страница /reset-password). */
export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initial);
  const [password, setPassword] = useState("");
  const [passwordFocused, setPasswordFocused] = useState(false);
  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <PasswordField
          id="password"
          label={t.auth.reset.newPassword}
          autoComplete="new-password"
          required
          error={fieldErrors.password}
          onValueChange={setPassword}
          onFocusChange={setPasswordFocused}
        />
        <PasswordStrength value={password} show={passwordFocused} />
      </div>
      <PasswordField
        id="confirmPassword"
        label={t.auth.reset.confirmPassword}
        autoComplete="new-password"
        required
        error={fieldErrors.confirmPassword}
      />

      {state.error ? (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" />
            {t.common.loading}
          </>
        ) : (
          t.auth.reset.submit
        )}
      </Button>
    </form>
  );
}
