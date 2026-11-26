"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/form-dialog";
import { t } from "@/lib/i18n";
import { ChangePasswordForm } from "./change-password-form";

/** Кнопка «Сменить пароль» + модалка с формой. Закрывается при успешной смене. */
export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.settings.changePassword}
      trigger={
        <Button variant="outline">
          <KeyRound className="size-4" />
          {t.settings.changePassword}
        </Button>
      }
    >
      <ChangePasswordForm onSuccess={() => setOpen(false)} />
    </FormDialog>
  );
}
