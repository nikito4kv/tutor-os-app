"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_RECURRENCE_COUNT, MAX_RECURRENCE_OCCURRENCES } from "@/lib/constants";
import { t } from "@/lib/i18n";

/**
 * "Repeat" block for the add-lesson form. v1: weekly / every-2-weeks on the
 * start's own weekday (no multi-weekday — kept as a future RRULE extension),
 * ending after N lessons or on a date. Emits `repeat*` fields the server
 * action expands via `recurrence.ts`.
 */
export function RecurrenceField() {
  const [enabled, setEnabled] = useState(false);
  const [interval, setIntervalWeeks] = useState(1);
  const [endKind, setEndKind] = useState<"count" | "until">("count");
  const [count, setCount] = useState(DEFAULT_RECURRENCE_COUNT);

  return (
    <div className="space-y-3 rounded-md border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="repeat"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 rounded border-input"
        />
        {t.lessons.recurrence.toggle}
      </label>

      {enabled ? (
        <div className="space-y-3">
          <input type="hidden" name="repeat_interval" value={interval} />
          <input type="hidden" name="repeat_end" value={endKind} />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              variant={interval === 1 ? "default" : "outline"}
              onClick={() => setIntervalWeeks(1)}
            >
              {t.lessons.recurrence.everyWeek}
            </Button>
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              variant={interval === 2 ? "default" : "outline"}
              onClick={() => setIntervalWeeks(2)}
            >
              {t.lessons.recurrence.everyTwoWeeks}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              variant={endKind === "count" ? "default" : "outline"}
              onClick={() => setEndKind("count")}
            >
              {t.lessons.recurrence.endsAfter}
            </Button>
            {endKind === "count" ? (
              <>
                <Input
                  type="number"
                  name="repeat_count"
                  min={1}
                  max={MAX_RECURRENCE_OCCURRENCES}
                  value={count}
                  onChange={(e) => setCount(Number(e.target.value))}
                  className="h-11 w-20"
                />
                <span className="text-sm text-muted-foreground">
                  {t.lessons.recurrence.occurrences}
                </span>
              </>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="min-h-11"
              variant={endKind === "until" ? "default" : "outline"}
              onClick={() => setEndKind("until")}
            >
              {t.lessons.recurrence.endsOn}
            </Button>
            {endKind === "until" ? (
              <Input type="date" name="repeat_until" className="h-11 w-44" />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
