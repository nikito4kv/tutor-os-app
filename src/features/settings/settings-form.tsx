"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SHORT_TEXT_MAX } from "@/lib/constants";
import { SUPPORTED_CURRENCIES, CURRENCY_LABELS, type CurrencyCode } from "@/lib/currency";
import { t } from "@/lib/i18n";
import { updateSettingsAction, type SettingsState } from "./actions";

const initial: SettingsState = {};

export function SettingsForm({ name, currency }: { name: string; currency: CurrencyCode }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(updateSettingsAction, initial);
  // Контролируемые поля: иначе React 19 после сабмита сбрасывает uncontrolled-инпуты
  // к их defaultValue, и select «откатывался» к прежней валюте, несмотря на сохранение.
  const [nameValue, setNameValue] = useState(state.name ?? name);
  const [currencyValue, setCurrencyValue] = useState<CurrencyCode>(state.currency ?? currency);

  // После сохранения страница ревалидируется и присылает свежие props — синхронизируем.
  useEffect(() => setNameValue(state.name ?? name), [name, state.name]);
  useEffect(() => {
    setCurrencyValue(state.currency ?? currency);
  }, [currency, state.currency]);
  useEffect(() => {
    if (state.saved) router.refresh();
  }, [router, state.saved, state.savedVersion]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      action(formData);
    });
  }

  return (
    <form action={action} onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">{t.auth.name}</Label>
        <Input
          id="name"
          name="name"
          value={nameValue}
          maxLength={SHORT_TEXT_MAX}
          onChange={(e) => setNameValue(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="currency">{t.settings.currency}</Label>
        <select
          id="currency"
          name="currency"
          value={currencyValue}
          onChange={(e) => setCurrencyValue(e.target.value as CurrencyCode)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {SUPPORTED_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {CURRENCY_LABELS[code]}
            </option>
          ))}
        </select>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.saved ? <p className="text-sm text-success">{t.settings.saved}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? t.common.loading : t.common.save}
      </Button>
    </form>
  );
}
