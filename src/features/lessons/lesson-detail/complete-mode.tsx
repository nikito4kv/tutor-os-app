"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/character-counter";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ONBOARDING_ACTIONS } from "@/features/onboarding/constants";
import { notifyOnboardingAction } from "@/features/onboarding/events";
import { HomeworkFileField } from "@/features/homework/homework-file-field";
import { LESSON_NOTE_MAX, LESSON_TOPIC_MAX, LONG_TEXT_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { Lesson } from "../queries";
import { completeLessonAction, type CompleteLessonState } from "../actions";
import { LowBalanceBanner } from "./parts";

export function CompleteMode({
  lesson,
  lessonsLeft,
  onClose,
}: {
  lesson: Lesson;
  lessonsLeft: number;
  onClose: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    completeLessonAction,
    {} as CompleteLessonState,
  );
  const [withHomework, setWithHomework] = React.useState(false);
  const [topicLen, setTopicLen] = React.useState(lesson.topic?.length ?? 0);
  const [noteLen, setNoteLen] = React.useState(lesson.note?.length ?? 0);
  const [homeworkTitleLen, setHomeworkTitleLen] = React.useState(0);
  const [homeworkDescriptionLen, setHomeworkDescriptionLen] = React.useState(0);

  React.useEffect(() => {
    // Close right away unless we need to surface a low-balance warning.
    if (!state.ok) return;

    notifyOnboardingAction(ONBOARDING_ACTIONS.complete);
    if (!state.lowBalance) onClose();
  }, [state, onClose]);

  function handleHomeworkToggle(checked: boolean) {
    setWithHomework(checked);
    if (!checked) {
      setHomeworkTitleLen(0);
      setHomeworkDescriptionLen(0);
    }
  }

  if (state.ok && state.lowBalance) {
    return (
      <div className="space-y-4">
        <LowBalanceBanner lessonsLeft={state.lessonsLeft ?? 0} />
        <DialogFooter>
          <DialogClose asChild>
            <Button onClick={onClose}>{t.common.close}</Button>
          </DialogClose>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lesson_id" value={lesson.id} />
      <input type="hidden" name="student_id" value={lesson.student_id} />

      <p className="text-sm text-muted-foreground">
        {t.lessons.completeHint} {t.lessons.lessonsLeftShort}{" "}
        <span className="font-medium text-foreground">{lessonsLeft}</span>
      </p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="topic">{t.lessons.fields.topic}</Label>
          <CharacterCounter value={topicLen} max={LESSON_TOPIC_MAX} />
        </div>
        <Input
          id="topic"
          name="topic"
          defaultValue={lesson.topic ?? ""}
          maxLength={LESSON_TOPIC_MAX}
          onChange={(event) => setTopicLen(event.target.value.length)}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="note">{t.lessons.fields.note}</Label>
          <CharacterCounter value={noteLen} max={LESSON_NOTE_MAX} />
        </div>
        <Textarea
          id="note"
          name="note"
          defaultValue={lesson.note ?? ""}
          maxLength={LESSON_NOTE_MAX}
          onChange={(event) => setNoteLen(event.target.value.length)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={withHomework}
          onChange={(event) => handleHomeworkToggle(event.target.checked)}
          className="size-4 rounded border-input"
        />
        {t.lessons.assignHomework}
      </label>

      {withHomework ? (
        <div className="space-y-3 rounded-md border p-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="title">{t.homework.fields.title}</Label>
              <CharacterCounter value={homeworkTitleLen} max={SHORT_TEXT_MAX} />
            </div>
            <Input
              id="title"
              name="title"
              maxLength={SHORT_TEXT_MAX}
              onChange={(event) => setHomeworkTitleLen(event.target.value.length)}
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="description">{t.homework.fields.description}</Label>
              <CharacterCounter value={homeworkDescriptionLen} max={LONG_TEXT_MAX} />
            </div>
            <Textarea
              id="description"
              name="description"
              maxLength={LONG_TEXT_MAX}
              onChange={(event) => setHomeworkDescriptionLen(event.target.value.length)}
            />
          </div>
          <div className="space-y-1.5">
            <HomeworkFileField name="attachment" label={t.homework.fields.attachment} />
          </div>
        </div>
      ) : null}

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="ghost">
            {t.common.cancel}
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          {pending
            ? t.common.loading
            : withHomework
              ? t.lessons.completeWithHomework
              : t.lessons.complete}
        </Button>
      </DialogFooter>
    </form>
  );
}
