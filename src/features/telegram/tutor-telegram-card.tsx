"use client";

import { useState, useTransition } from "react";
import { Check, Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { startTutorLinkAction, disconnectTutorAction } from "./actions";

/**
 * Settings section to connect the tutor's own Telegram. "Connect" mints a
 * one-time deep link; the tutor opens it and presses Start in the bot, which
 * captures their chat id (see webhook.ts). Status reflects after a page refresh.
 */
export function TutorTelegramCard({
  connected,
  configured,
}: {
  connected: boolean;
  configured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function connect() {
    setError(null);
    startTransition(async () => {
      const res = await startTutorLinkAction();
      if (res.error) setError(res.error);
      else setDeepLink(res.deepLink ?? null);
    });
  }

  if (!configured) {
    return <p className="text-sm text-muted-foreground">{t.telegram.settings.notConfigured}</p>;
  }

  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 text-sm">
          <Check className="size-4 text-primary" />
          {t.telegram.settings.connected}
        </span>
        <form action={disconnectTutorAction}>
          <Button type="submit" variant="outline" size="sm">
            {t.telegram.settings.disconnect}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {deepLink ? (
        <div className="space-y-2">
          <a
            href={deepLink}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "default", size: "sm" }))}
          >
            <Send className="size-4" />
            {t.telegram.settings.openBot}
          </a>
          <p className="text-xs text-muted-foreground">{t.telegram.settings.instruction}</p>
          <p className="text-xs text-muted-foreground">{t.telegram.settings.ttlHint}</p>
        </div>
      ) : (
        <Button onClick={connect} disabled={pending} variant="outline" size="sm">
          <Send className="size-4" />
          {t.telegram.settings.connect}
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
