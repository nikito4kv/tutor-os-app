"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

/**
 * Student-card block: the tutor copies a Telegram deep link and sends it to the
 * student, who presses Start to subscribe to lesson/homework reminders. Shows the
 * current link status and a disconnect action once connected.
 */
export function StudentTelegramLink({
  deepLink,
  connected,
  disconnectAction,
}: {
  deepLink: string;
  connected: boolean;
  disconnectAction: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <p className="text-sm font-medium">{t.telegram.student.title}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {connected ? t.telegram.student.connected : t.telegram.student.description}
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={copy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {t.telegram.student.copyLink}
        </Button>
        {connected ? (
          <form action={disconnectAction}>
            <Button type="submit" variant="outline" size="sm">
              {t.telegram.student.disconnect}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
