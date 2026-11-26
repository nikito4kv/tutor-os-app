"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

export function DeletePackageButton({ action }: { action: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!window.confirm(t.packages.deleteConfirm)) return;
    startTransition(() => {
      void action();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={pending}
      aria-label={t.common.delete}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
