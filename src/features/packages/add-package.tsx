"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_ACTIONS } from "@/features/onboarding/constants";
import { notifyOnboardingAction } from "@/features/onboarding/events";
import { PACKAGE_PRESETS } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { createPackageAction, type PackageFormState } from "./actions";

const initial: PackageFormState = {};

export function AddPackage({ studentId, trigger }: { studentId: string; trigger?: ReactNode }) {
  const action = createPackageAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState<number>(PACKAGE_PRESETS[0]);

  useEffect(() => {
    // useActionState returns a fresh object on every completed submit, so this
    // fires on each success — collapse the form and reset the count.
    if (state.ok) {
      setOpen(false);
      setCount(PACKAGE_PRESETS[0]);
      notifyOnboardingAction(ONBOARDING_ACTIONS.balance);
    }
  }, [state]);

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.packages.add}
      trigger={
        trigger ?? (
          <Button size="sm" data-onboarding-target="add-package">
            <Plus className="size-4" />
            {t.packages.add}
          </Button>
        )
      }
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="total_lessons">{t.packages.fields.totalLessons}</Label>
          <div className="flex flex-wrap gap-2">
            {PACKAGE_PRESETS.map((n) => (
              <Button
                key={n}
                type="button"
                size="sm"
                variant={count === n ? "default" : "outline"}
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
          </div>
          <Input
            id="total_lessons"
            name="total_lessons"
            type="number"
            min={1}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="price">
            {t.packages.fields.price}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({t.common.optional})
            </span>
          </Label>
          <Input id="price" name="price" type="number" min={0} step={1} inputMode="numeric" />
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
