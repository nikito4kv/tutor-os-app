"use client";

import { useActionState, useEffect, useId, useState, type FormEvent } from "react";
import {
  Bug,
  CheckCircle2,
  HelpCircle,
  LifeBuoy,
  Lightbulb,
  MessageCircle,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/character-counter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { SHORT_TEXT_MAX, SUPPORT_MESSAGE_MAX } from "@/lib/constants";
import { ONBOARDING_STATE_EVENT, ONBOARDING_STORAGE_KEY } from "@/features/onboarding/constants";
import { t } from "@/lib/i18n";
import { submitSupportFeedbackAction, type SupportFeedbackState } from "./actions";
import type { SupportCategory } from "./schema";

const initial: SupportFeedbackState = {};

/**
 * Активен ли тур онбординга (читаем его localStorage-состояние и слушаем его
 * событие). Нужно, чтобы во время обучения увести support-FAB ПОД слой тура —
 * иначе на мобильной кнопка висит поверх подсказки и мешает.
 */
function useOnboardingActive(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function read() {
      try {
        const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
        if (!raw || raw === "done") {
          setActive(false);
          return;
        }
        const parsed = JSON.parse(raw) as { status?: unknown };
        setActive(parsed?.status === "active");
      } catch {
        setActive(false);
      }
    }

    read();
    window.addEventListener(ONBOARDING_STATE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(ONBOARDING_STATE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return active;
}

const CATEGORY_ICONS: Record<SupportCategory, typeof Bug> = {
  bug: Bug,
  idea: Lightbulb,
  question: HelpCircle,
  other: MessageCircle,
};

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [canDismissOutside, setCanDismissOutside] = useState(true);
  const onboardingActive = useOnboardingActive();

  function closePanel() {
    setOpen(false);
    setFormKey((key) => key + 1);
    setCanDismissOutside(true);
  }

  return (
    <>
      {open && canDismissOutside ? (
        <button
          type="button"
          aria-label={t.support.closeEmpty}
          className="fixed inset-0 z-40 cursor-default bg-transparent"
          onClick={closePanel}
        />
      ) : null}

      {/* Во время тура уводим FAB под слой онбординга (spotlight z-40 / карточка
          z-50): на мобильной он больше не висит поверх подсказки и не мешает. */}
      <div
        className={cn(
          "fixed bottom-24 right-4 z-50 flex flex-col items-end sm:right-6 md:bottom-6",
          onboardingActive && "z-30",
        )}
      >
        {open ? (
          <SupportPanel key={formKey} onClose={closePanel} onEmptyChange={setCanDismissOutside} />
        ) : null}

        <Button
          type="button"
          className={cn(
            "mt-3 h-11 w-32 rounded-full px-4 shadow-lg shadow-primary/20",
            open ? "bg-secondary text-secondary-foreground hover:bg-secondary/80" : "",
          )}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={t.support.button}
        >
          {open ? <X className="size-4" /> : <LifeBuoy className="size-4" />}
          <span>{open ? t.common.cancel : t.support.button}</span>
        </Button>
      </div>
    </>
  );
}

function SupportPanel({
  onClose,
  onEmptyChange,
}: {
  onClose: () => void;
  onEmptyChange: (empty: boolean) => void;
}) {
  const [submissionKey, setSubmissionKey] = useState(0);
  const titleId = useId();

  function resetForm() {
    setSubmissionKey((key) => key + 1);
    onEmptyChange(true);
  }

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      className="w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-lg border bg-card text-card-foreground shadow-2xl shadow-foreground/10"
    >
      <div className="h-1 bg-primary" />
      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold">
              {t.support.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.support.description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              focusRing,
            )}
            aria-label={t.common.cancel}
          >
            <X className="size-4" />
          </button>
        </div>

        <SupportForm key={submissionKey} onReset={resetForm} onEmptyChange={onEmptyChange} />
      </div>
    </section>
  );
}

function SupportForm({
  onReset,
  onEmptyChange,
}: {
  onReset: () => void;
  onEmptyChange: (empty: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(submitSupportFeedbackAction, initial);
  const [pageUrl, setPageUrl] = useState("");
  const [messageLen, setMessageLen] = useState(0);

  useEffect(() => {
    setPageUrl(window.location.href);
    onEmptyChange(true);
  }, [onEmptyChange]);

  function handleFormInput(event: FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const rawMessage = String(formData.get("message") ?? "");
    const message = rawMessage.trim();
    const contact = String(formData.get("contact") ?? "").trim();
    setMessageLen(rawMessage.length);
    onEmptyChange(message.length === 0 && contact.length === 0);
  }

  return (
    <div className="relative min-h-[24rem]">
      <form
        action={formAction}
        onInput={handleFormInput}
        className={cn(
          "space-y-4 transition duration-200",
          state.ok ? "pointer-events-none select-none blur-[2px]" : "",
        )}
        aria-hidden={state.ok ? "true" : undefined}
      >
        <input type="hidden" name="page_url" value={pageUrl} />

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">{t.support.fields.category}</legend>
          <div className="grid grid-cols-2 gap-2">
            {t.support.categories.map((category) => {
              const Icon = CATEGORY_ICONS[category.value];
              return (
                <label
                  key={category.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/60",
                    focusRing,
                    "has-[:checked]:border-primary has-[:checked]:bg-accent has-[:checked]:text-accent-foreground",
                  )}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="category"
                    value={category.value}
                    defaultChecked={category.value === "bug"}
                  />
                  <Icon className="size-4 shrink-0" />
                  <span>{category.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="support-message">{t.support.fields.message}</Label>
            <CharacterCounter value={messageLen} max={SUPPORT_MESSAGE_MAX} />
          </div>
          <Textarea
            id="support-message"
            name="message"
            minLength={5}
            maxLength={SUPPORT_MESSAGE_MAX}
            placeholder={t.support.placeholders.message}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="support-contact">
            {t.support.fields.contact}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({t.common.optional})
            </span>
          </Label>
          <Input
            id="support-contact"
            name="contact"
            maxLength={SHORT_TEXT_MAX}
            placeholder={t.support.placeholders.contact}
          />
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={pending}>
            <Send className="size-4" />
            {pending ? t.common.loading : t.support.submit}
          </Button>
        </div>
      </form>

      {state.ok ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-md bg-card/65 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm space-y-4 rounded-md border border-success/30 bg-success/10 p-4 text-center text-success shadow-xl">
            <CheckCircle2 className="mx-auto size-6" />
            <div>
              <p className="font-medium">{t.support.successTitle}</p>
              <p className="mt-1 text-sm">{t.support.successDescription}</p>
            </div>
            <Button type="button" size="sm" className="mx-auto" onClick={onReset}>
              {t.support.successClose}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
