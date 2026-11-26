"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CharacterCounter } from "@/components/character-counter";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ColorPicker } from "@/components/color-picker";
import { LESSON_NOTE_MAX, LESSON_TOPIC_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";
import { asLessonColor, DEFAULT_LESSON_COLOR } from "@/lib/lesson-colors";
import type { Lesson } from "../queries";
import { updateLessonCardAction, type LessonFormState } from "../actions";

export function EditMode({
  lesson,
  onDone,
  onCancel,
}: {
  lesson: Lesson;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(
    updateLessonCardAction,
    {} as LessonFormState,
  );
  const lessonColor = asLessonColor(lesson.color) ?? DEFAULT_LESSON_COLOR;
  const [topicLen, setTopicLen] = React.useState(lesson.topic?.length ?? 0);
  const [noteLen, setNoteLen] = React.useState(lesson.note?.length ?? 0);

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lesson_id" value={lesson.id} />
      <input type="hidden" name="student_id" value={lesson.student_id} />

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

      <div className="space-y-1.5">
        <Label>{t.lessons.fields.color}</Label>
        <ColorPicker defaultValue={lessonColor} />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? t.common.loading : t.common.save}
        </Button>
      </DialogFooter>
    </form>
  );
}
