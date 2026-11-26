"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/character-counter";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { FormDialog } from "@/components/form-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/color-picker";
import { ONBOARDING_ACTIONS } from "@/features/onboarding/constants";
import { notifyOnboardingAction } from "@/features/onboarding/events";
import { LESSON_NOTE_MAX, LESSON_TOPIC_MAX } from "@/lib/constants";
import { addDays, parseDateKey } from "@/lib/date";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { createLessonAction, type LessonFormState } from "./actions";
import { LessonScheduleField } from "./lesson-schedule-field";

/**
 * Sensible default start date. When the schedule page has a specific day open
 * (`defaultDate`), seed that day. Otherwise, on a student card with prior lessons
 * the rhythm is usually weekly — offer "last lesson + 7 days"; failing that,
 * tomorrow. Time of day is chosen per weekday in the schedule block, so only the
 * date matters.
 */
function defaultStartDate({
  defaultDate,
  lastLessonAt,
}: {
  defaultDate?: string;
  lastLessonAt?: string;
}): Date {
  const picked = parseDateKey(defaultDate);
  if (picked) return picked;
  if (lastLessonAt) {
    const next = addDays(new Date(lastLessonAt), 7);
    if (!Number.isNaN(next.getTime()) && next.getTime() > Date.now()) return next;
  }
  return addDays(new Date(), 1);
}

const initial: LessonFormState = {};

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

type StudentOption = { id: string; name: string };

/**
 * "Add lesson" form (modal). On a student card pass `studentId` (rendered as a
 * hidden input); on the schedule page pass `students` to render a picker. The
 * scheduling — start date, weekdays, per-day times, repeat — lives in
 * <LessonScheduleField>; this file owns the surrounding fields and submit flow.
 */
export function AddLesson({
  studentId,
  students,
  lessonsLeft,
  lastLessonAt,
  defaultDate,
}: {
  studentId?: string;
  students?: StudentOption[];
  /** Current balance, shown as a hint on the student card (warns when empty). */
  lessonsLeft?: number;
  /** ISO start of the student's latest lesson — seeds the "+7 days" default. */
  lastLessonAt?: string;
  /** Selected-day key ("YYYY-MM-DD") from the schedule page — seeds the start date. */
  defaultDate?: string;
}) {
  const [state, formAction, pending] = useActionState(createLessonAction, initial);
  const [open, setOpen] = useState(false);
  const [topicLen, setTopicLen] = useState(0);
  const [noteLen, setNoteLen] = useState(0);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!state.ok) return;

    setOpen(false);
    setTopicLen(0);
    setNoteLen(0);
    setFormKey((key) => key + 1);
    notifyOnboardingAction(ONBOARDING_ACTIONS.schedule);
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      formAction(formData);
    });
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={t.lessons.newLesson}
      description={t.lessons.newLessonSubtitle}
      trigger={
        <Button size="sm" data-onboarding-target="add-lesson">
          <Plus className="size-4" />
          {t.lessons.add}
        </Button>
      }
    >
      <form key={formKey} action={formAction} onSubmit={handleSubmit} className="space-y-4">
        {lessonsLeft != null ? (
          <p className={cn("text-sm", lessonsLeft <= 0 ? "text-warning" : "text-muted-foreground")}>
            {t.lessons.lessonsLeftShort} <span className="font-medium">{lessonsLeft}</span>
            {lessonsLeft <= 0 ? ` — ${t.students.lowBalance}` : ""}
          </p>
        ) : null}

        {studentId ? (
          <input type="hidden" name="student_id" value={studentId} />
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="student_id">{t.lessons.fields.student}</Label>
            <select
              id="student_id"
              name="student_id"
              defaultValue=""
              required
              className={selectClass}
            >
              <option value="" disabled>
                {t.lessons.selectStudent}
              </option>
              {(students ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="topic">
              {t.lessons.fields.topic}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t.common.optional})
              </span>
            </Label>
            <CharacterCounter value={topicLen} max={LESSON_TOPIC_MAX} />
          </div>
          <Input
            id="topic"
            name="topic"
            maxLength={LESSON_TOPIC_MAX}
            onChange={(event) => setTopicLen(event.target.value.length)}
          />
        </div>

        <LessonScheduleField defaultDate={defaultStartDate({ defaultDate, lastLessonAt })} />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="note">
              {t.lessons.fields.note}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t.common.optional})
              </span>
            </Label>
            <CharacterCounter value={noteLen} max={LESSON_NOTE_MAX} />
          </div>
          <Textarea
            id="note"
            name="note"
            maxLength={LESSON_NOTE_MAX}
            onChange={(e) => setNoteLen(e.target.value.length)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>{t.lessons.fields.color}</Label>
          <ColorPicker />
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

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
