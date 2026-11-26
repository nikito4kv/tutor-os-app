"use client";

import { useActionState, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/character-counter";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { pressable } from "@/lib/styles";
import { LONG_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { HomeworkStatus } from "@/lib/supabase/database.types";
import { submitHomeworkAction, type ShareHomeworkFormState } from "./actions";

const initial: ShareHomeworkFormState = {};

/**
 * Collapses homework submission behind a "Сдать" button (DESIGN §7 — modal is
 * the default for actions), so several pending homeworks no longer stack as open
 * forms. For an already-submitted item the trigger becomes "Изменить ответ" and
 * the textarea is pre-filled; the action overwrites the answer (re-submit keeps
 * any previously uploaded file). Closes itself on success, like AddPackage.
 */
export function SubmitHomeworkDialog({
  token,
  homeworkId,
  status,
  defaultText,
}: {
  token: string;
  homeworkId: string;
  status: HomeworkStatus;
  defaultText: string | null;
}) {
  const action = submitHomeworkAction.bind(null, token, homeworkId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  const [submissionLen, setSubmissionLen] = useState(defaultText?.length ?? 0);

  useEffect(() => {
    // useActionState returns a fresh object on each completed submit — close on ok.
    if (state.ok) setOpen(false);
  }, [state]);

  const isResubmit = status === "submitted";
  const label = isResubmit ? t.share.changeAnswer : t.homework.submit;

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={label}
      trigger={
        <Button
          size="sm"
          variant={isResubmit ? "outline" : "default"}
          className={cn("h-11 w-full sm:h-9 sm:w-auto", pressable)}
        >
          <Send className="size-4" />
          {label}
        </Button>
      }
    >
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor={`submission-text-${homeworkId}`}>
              {t.homework.fields.submissionText}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t.common.optional})
              </span>
            </Label>
            <CharacterCounter value={submissionLen} max={LONG_TEXT_MAX} />
          </div>
          <Textarea
            id={`submission-text-${homeworkId}`}
            name="submission_text"
            maxLength={LONG_TEXT_MAX}
            defaultValue={defaultText ?? ""}
            onChange={(event) => setSubmissionLen(event.target.value.length)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`submission-file-${homeworkId}`}>
            {t.homework.fields.submissionFile}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({t.common.optional})
            </span>
          </Label>
          <Input id={`submission-file-${homeworkId}`} name="submission_file" type="file" />
          <p className="text-xs text-muted-foreground">{t.homework.fileLimit}</p>
        </div>

        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button type="submit" disabled={pending} className={pressable}>
            <Send className="size-4" />
            {pending ? t.common.loading : t.homework.submit}
          </Button>
        </DialogFooter>
      </form>
    </FormDialog>
  );
}
