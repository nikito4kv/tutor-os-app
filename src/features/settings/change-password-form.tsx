"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "@/features/auth/password-input";
import { PasswordStrength } from "@/features/auth/password-strength";
import { t } from "@/lib/i18n";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initial: ChangePasswordState = {};

/**
 * Форма смены пароля: текущий → новый (с live-чеклистом силы) → подтверждение.
 * Поля uncontrolled (значения уходят в FormData по `name`), `onSuccess` вызывается
 * при успехе, чтобы родитель закрыл модалку.
 */
export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, action, pending] = useActionState(changePasswordAction, initial);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);

  useEffect(() => {
    if (state.saved) onSuccess?.();
  }, [state.saved, onSuccess]);

  // После сабмита React сбрасывает uncontrolled-поля формы — синхронизируем зеркало
  // значения, иначе индикатор силы продолжит показывать прежний (уже стёртый) пароль.
  useEffect(() => {
    setNewPassword("");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <PasswordField
        id="currentPassword"
        label={t.settings.currentPassword}
        autoComplete="current-password"
        required
        error={state.fieldErrors?.currentPassword}
      />

      <div className="space-y-2">
        <PasswordField
          id="newPassword"
          label={t.settings.newPassword}
          autoComplete="new-password"
          required
          error={state.fieldErrors?.newPassword}
          onValueChange={setNewPassword}
          onFocusChange={setNewPasswordFocused}
        />
        <PasswordStrength value={newPassword} show={newPasswordFocused} />
      </div>

      <PasswordField
        id="confirmPassword"
        label={t.settings.confirmNewPassword}
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.saved ? <p className="text-sm text-success">{t.settings.passwordChanged}</p> : null}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.common.loading : t.settings.changePassword}
      </Button>
    </form>
  );
}
