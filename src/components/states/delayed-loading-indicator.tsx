"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type DelayedLoadingIndicatorProps = {
  delayMs?: number;
  className?: string;
};

export function DelayedLoadingIndicator({
  delayMs = 300,
  className,
}: DelayedLoadingIndicatorProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(true), delayMs);

    return () => window.clearTimeout(timeout);
  }, [delayMs]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border bg-card/95 px-3 py-2 text-sm font-medium text-foreground shadow-lg backdrop-blur",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin text-primary" />
      <span>{t.common.loading}</span>
    </div>
  );
}
