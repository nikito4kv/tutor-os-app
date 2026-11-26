"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ONBOARDING_ACTIONS } from "@/features/onboarding/constants";
import { noteOnboardingActionIntent } from "@/features/onboarding/events";
import { SHARE_CODE_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { StudentFormState } from "./actions";
import type { Student } from "./queries";
import { readablePartOf } from "./share-token";

type Action = (prev: StudentFormState, formData: FormData) => Promise<StudentFormState>;

const initial: StudentFormState = {};

/**
 * Student create/edit fields. Rendered inside a `FormDialog`; a successful submit
 * redirects (server action), which closes the modal by navigating away.
 */
export function StudentForm({ action, student }: { action: Action; student?: Student }) {
  const [state, formAction, pending] = useActionState(action, initial);
  const f = t.students.fields;

  function handleSubmit() {
    if (!student) {
      noteOnboardingActionIntent(ONBOARDING_ACTIONS.students);
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="space-y-4">
      <Field
        id="name"
        label={f.name}
        defaultValue={student?.name}
        maxLength={SHORT_TEXT_MAX}
        required
      />
      <Field
        id="subject"
        label={f.subject}
        defaultValue={student?.subject ?? ""}
        maxLength={SHORT_TEXT_MAX}
      />
      <Field
        id="level"
        label={f.level}
        defaultValue={student?.level ?? ""}
        maxLength={SHORT_TEXT_MAX}
      />
      <Field
        id="contact"
        label={f.contact}
        defaultValue={student?.contact ?? ""}
        maxLength={SHORT_TEXT_MAX}
      />
      <Field
        id="parent_contact"
        label={f.parentContact}
        defaultValue={student?.parent_contact ?? ""}
        maxLength={SHORT_TEXT_MAX}
      />
      <Field
        id="share_code"
        label={f.shareCode}
        defaultValue={student ? readablePartOf(student.share_token) : ""}
        hint={student ? t.students.share.codeHintEdit : t.students.share.codeHintCreate}
        maxLength={SHARE_CODE_MAX}
      />

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            {t.common.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({
  id,
  label,
  defaultValue,
  required,
  hint,
  maxLength,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? null : (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            ({t.common.optional})
          </span>
        )}
      </Label>
      <Input
        id={id}
        name={id}
        defaultValue={defaultValue}
        maxLength={maxLength}
        required={required}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
