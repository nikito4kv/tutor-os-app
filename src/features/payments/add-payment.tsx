"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { createPaymentAction, type PaymentFormState } from "./actions";

const initial: PaymentFormState = {};

export function AddPayment({ studentId }: { studentId: string }) {
  const action = createPaymentAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  // Form is client-only (rendered after a click), so this never SSR-mismatches.
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.payments.add}
      trigger={
        <Button size="sm">
          <Plus className="size-4" />
          {t.payments.add}
        </Button>
      }
    >
      <form action={formAction} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="amount">{t.payments.fields.amount}</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paid_at">{t.payments.fields.paidAt}</Label>
            <Input id="paid_at" name="paid_at" type="date" defaultValue={today} required />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="note">
            {t.payments.fields.note}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({t.common.optional})
            </span>
          </Label>
          <Textarea id="note" name="note" maxLength={SHORT_TEXT_MAX} />
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? t.common.loading : t.common.create}
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
