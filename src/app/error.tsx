"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export default function RootError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-2xl rounded-lg border border-destructive/30 bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" />
          </div>

          <div className="min-w-0 space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">{t.errors.errorEyebrow}</p>
              <h1 className="text-2xl font-semibold tracking-tight">{t.errors.errorTitle}</h1>
              <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                {t.errors.errorDescription}
              </p>
            </div>

            <Button onClick={reset}>
              <RotateCcw className="size-4" />
              {t.common.errorRetry}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
