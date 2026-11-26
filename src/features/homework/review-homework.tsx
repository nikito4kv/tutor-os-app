"use client";

import { useActionState, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/character-counter";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REVIEW_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { reviewHomeworkAction, type HomeworkFormState } from "./actions";

const initial: HomeworkFormState = {};

export function ReviewHomework({
  studentId,
  homeworkId,
  defaultFeedback,
}: {
  studentId: string;
  homeworkId: string;
  defaultFeedback: string | null;
}) {
  const action = reviewHomeworkAction.bind(null, studentId, homeworkId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [feedbackLen, setFeedbackLen] = useState(defaultFeedback?.length ?? 0);

  return (
    <form action={formAction} className="space-y-3 rounded-md bg-muted/40 p-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor={`feedback-${homeworkId}`}>{t.homework.fields.feedback}</Label>
          <CharacterCounter value={feedbackLen} max={REVIEW_TEXT_MAX} />
        </div>
        <Textarea
          id={`feedback-${homeworkId}`}
          name="feedback"
          maxLength={REVIEW_TEXT_MAX}
          defaultValue={defaultFeedback ?? ""}
          onChange={(event) => setFeedbackLen(event.target.value.length)}
          required
        />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" size="sm" disabled={pending}>
        <CheckCircle className="size-4" />
        {pending ? t.common.loading : t.homework.review}
      </Button>
    </form>
  );
}
