"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { t } from "@/lib/i18n";
import { LessonDateTimeRangeField } from "../lesson-date-time-range-field";
import type { Lesson } from "../queries";
import {
  updateLessonAction,
  updateSeriesAction,
  type LessonFormState,
  type SeriesScope,
} from "../actions";

export function RescheduleMode({
  lesson,
  onDone,
  onCancel,
}: {
  lesson: Lesson;
  onDone: () => void;
  onCancel: () => void;
}) {
  const scheduleEditable = lesson.status === "scheduled" || lesson.status === "canceled";
  const isSeries = Boolean(lesson.series_id);
  const seriesEditable = scheduleEditable && isSeries;

  const [scope, setScope] = React.useState<SeriesScope>("one");
  const [state, formAction, pending] = React.useActionState(
    seriesEditable ? updateSeriesAction : updateLessonAction,
    {} as LessonFormState,
  );

  React.useEffect(() => {
    if (state.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lesson_id" value={lesson.id} />
      <input type="hidden" name="student_id" value={lesson.student_id} />
      {scheduleEditable && lesson.status === "canceled" ? (
        <input type="hidden" name="reactivate" value="1" />
      ) : null}
      {seriesEditable ? (
        <>
          <input type="hidden" name="series_id" value={lesson.series_id ?? ""} />
          <input type="hidden" name="original_starts_at" value={lesson.starts_at} />
          <input type="hidden" name="scope" value={scope} />
        </>
      ) : null}

      {scheduleEditable ? (
        <LessonDateTimeRangeField
          defaultStartsAt={new Date(lesson.starts_at)}
          defaultDurationMin={lesson.duration_min}
        />
      ) : null}

      {seriesEditable ? (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">{t.lessons.recurrence.scopeTitle}</p>
          <div className="flex flex-wrap gap-2">
            {(["one", "future", "all"] as const).map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                className="min-h-11"
                variant={scope === s ? "default" : "outline"}
                onClick={() => setScope(s)}
              >
                {s === "one"
                  ? t.lessons.recurrence.scopeOne
                  : s === "future"
                    ? t.lessons.recurrence.scopeFuture
                    : t.lessons.recurrence.scopeAll}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

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
