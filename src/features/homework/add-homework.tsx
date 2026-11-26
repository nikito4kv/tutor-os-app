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
import { ONBOARDING_ACTIONS } from "@/features/onboarding/constants";
import { notifyOnboardingAction } from "@/features/onboarding/events";
import { formatDateTime } from "@/lib/date";
import { LONG_TEXT_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { createHomeworkAction, type HomeworkFormState } from "./actions";
import { HomeworkFileField } from "./homework-file-field";
import type { Lesson } from "@/features/lessons/queries";

const initial: HomeworkFormState = {};

export function AddHomework({
  studentId,
  lessons,
}: {
  studentId: string;
  lessons: Pick<Lesson, "id" | "starts_at" | "topic" | "status">[];
}) {
  const action = createHomeworkAction.bind(null, studentId);
  const [state, formAction, pending] = useActionState(action, initial);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [selectedLessonId, setSelectedLessonId] = useState("");
  const [titleLen, setTitleLen] = useState(0);
  const [descriptionLen, setDescriptionLen] = useState(0);
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId);

  useEffect(() => {
    if (!state.ok) return;

    setOpen(false);
    setSelectedLessonId("");
    setTitleLen(0);
    setDescriptionLen(0);
    setFormKey((key) => key + 1);
    notifyOnboardingAction(ONBOARDING_ACTIONS.homework);
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
      title={t.homework.add}
      trigger={
        <Button size="sm" data-onboarding-target="add-homework">
          <Plus className="size-4" />
          {t.homework.add}
        </Button>
      }
    >
      <form key={formKey} action={formAction} onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="due_at" value={selectedLesson?.starts_at ?? ""} />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="title">{t.homework.fields.title}</Label>
            <CharacterCounter value={titleLen} max={SHORT_TEXT_MAX} />
          </div>
          <Input
            id="title"
            name="title"
            maxLength={SHORT_TEXT_MAX}
            onChange={(event) => setTitleLen(event.target.value.length)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="lesson_id">
            {t.homework.fields.dueLesson}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({t.common.optional})
            </span>
          </Label>
          <select
            id="lesson_id"
            name="lesson_id"
            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            value={selectedLessonId}
            onChange={(event) => setSelectedLessonId(event.target.value)}
          >
            <option value="">{t.homework.noLesson}</option>
            {lessons.map((lesson) => (
              <option key={lesson.id} value={lesson.id}>
                {formatDateTime(lesson.starts_at)}
                {lesson.topic ? ` · ${lesson.topic}` : ""}
              </option>
            ))}
          </select>
          {lessons.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t.homework.noUpcomingLessons}</p>
          ) : (
            <p className="text-xs text-muted-foreground">{t.homework.dueLessonHint}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="description">
              {t.homework.fields.description}
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({t.common.optional})
              </span>
            </Label>
            <CharacterCounter value={descriptionLen} max={LONG_TEXT_MAX} />
          </div>
          <Textarea
            id="description"
            name="description"
            maxLength={LONG_TEXT_MAX}
            onChange={(event) => setDescriptionLen(event.target.value.length)}
          />
        </div>

        <HomeworkFileField name="attachment" label={t.homework.fields.attachment} />

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
