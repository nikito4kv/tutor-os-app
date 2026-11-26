"use client";

import { Check, X } from "lucide-react";
import { PASSWORD_RULES } from "./schema";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** 0 — пусто, 1 — слабый, 2 — средний, 3 — надёжный. */
function strengthLevel(passed: number): 0 | 1 | 2 | 3 {
  if (passed <= 0) return 0;
  if (passed <= 2) return 1;
  if (passed <= 4) return 2;
  return 3;
}

const LEVEL_META: Record<1 | 2 | 3, { label: string; bar: string; text: string }> = {
  1: { label: t.auth.strengthWeak, bar: "bg-destructive", text: "text-destructive" },
  2: { label: t.auth.strengthMedium, bar: "bg-warning", text: "text-warning" },
  3: { label: t.auth.strengthStrong, bar: "bg-primary", text: "text-primary" },
};

/**
 * Live-индикатор: сегменты силы + чеклист требований. Считает прямо по
 * `PASSWORD_RULES`, поэтому совпадает с серверной проверкой.
 *
 * Показывается, пока в поле что-то введено ИЛИ пока поле в фокусе (`show`) —
 * так правила «высвечиваются» сразу при клике на поле (progressive disclosure),
 * ещё до первого символа. Появление раскрывает форму вниз (не сдвигает соседей
 * вбок) — без layout jump.
 */
export function PasswordStrength({ value, show = false }: { value: string; show?: boolean }) {
  if (!value && !show) return null;

  const results = PASSWORD_RULES.map((rule) => ({ id: rule.id, ok: rule.test(value) }));
  const passed = results.filter((r) => r.ok).length;
  const level = strengthLevel(passed);
  const meta = level === 0 ? null : LEVEL_META[level];

  return (
    <div
      className="space-y-2 rounded-md border bg-muted/30 p-3 duration-200 animate-in fade-in slide-in-from-top-1 motion-reduce:animate-none"
      aria-live="polite"
    >
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1" aria-hidden="true">
          {[1, 2, 3].map((seg) => (
            <span
              key={seg}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-200 motion-reduce:transition-none",
                meta && level >= seg ? meta.bar : "bg-border",
              )}
            />
          ))}
        </div>
        {meta ? (
          <span className={cn("text-xs font-medium", meta.text)}>
            {t.auth.strengthLabel}: {meta.label}
          </span>
        ) : null}
      </div>

      <ul className="space-y-1">
        {PASSWORD_RULES.map((rule) => {
          const ok = results.find((r) => r.id === rule.id)?.ok ?? false;
          return (
            <li
              key={rule.id}
              className={cn(
                "flex items-center gap-1.5 text-xs",
                ok ? "text-success" : "text-muted-foreground",
              )}
            >
              {ok ? <Check className="size-3.5 shrink-0" /> : <X className="size-3.5 shrink-0" />}
              {t.auth.passwordRules[rule.id]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
