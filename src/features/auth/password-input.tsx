"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";
import { FieldError } from "./auth-field";

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  error?: string;
  required?: boolean;
  /** Сообщает текущее значение наверх (нужно для индикатора силы пароля). */
  onValueChange?: (value: string) => void;
  /** Сообщает фокус наверх — чтобы показать правила пароля при активном поле. */
  onFocusChange?: (focused: boolean) => void;
}

/**
 * Поле пароля: показать/скрыть, подсказка о Caps Lock и инлайн-ошибка.
 * Само поле остаётся uncontrolled (значение уходит в FormData по `name`),
 * `onValueChange` лишь зеркалит ввод для live-чеклиста.
 */
export function PasswordField({
  id,
  label,
  autoComplete,
  error,
  required,
  onValueChange,
  onFocusChange,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  const capsId = `${id}-caps`;
  const errorId = `${id}-error`;
  const describedBy = [caps ? capsId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          className="pr-10"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          onChange={(e) => onValueChange?.(e.target.value)}
          onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
          onKeyDown={(e) => setCaps(e.getModifierState("CapsLock"))}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => {
            setCaps(false);
            onFocusChange?.(false);
          }}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
          aria-pressed={show}
          className="absolute right-0 top-0 grid h-10 w-10 cursor-pointer place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {caps ? (
        <p id={capsId} className="text-xs text-muted-foreground">
          {t.auth.capsLockOn}
        </p>
      ) : null}
      <FieldError id={id} message={error} />
    </div>
  );
}
