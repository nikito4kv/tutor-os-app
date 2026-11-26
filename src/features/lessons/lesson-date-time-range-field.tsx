"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import { DEFAULT_LESSON_DURATION_MIN } from "@/lib/constants";
import { t } from "@/lib/i18n";

type TimeRange = {
  start: string;
  end: string;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateOnly(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function timeOf(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isTimeValue(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function addMinutes(hhmm: string, mins: number): string {
  const total = (((toMinutes(hhmm) + mins) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

function toLocalDateTimeValue(date: Date, time: string): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${time}`;
}

export function LessonDateTimeRangeField({
  defaultStartsAt,
  defaultDurationMin,
}: {
  defaultStartsAt: Date;
  defaultDurationMin: number;
}) {
  const [date, setDate] = React.useState<Date>(() => dateOnly(defaultStartsAt));
  const [range, setRange] = React.useState<TimeRange>(() => {
    const start = timeOf(defaultStartsAt);
    return {
      start,
      end: addMinutes(start, defaultDurationMin),
    };
  });

  const durationMin = toMinutes(range.end) - toMinutes(range.start);
  const badRange = durationMin <= 0;
  const startsAt = isTimeValue(range.start) ? toLocalDateTimeValue(date, range.start) : "";

  function setStart(value: string) {
    setRange((current) => ({
      start: value,
      end: isTimeValue(value) ? addMinutes(value, DEFAULT_LESSON_DURATION_MIN) : current.end,
    }));
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="starts_at" value={startsAt} />
      <input type="hidden" name="duration_min" value={badRange ? "" : durationMin} />

      <div className="space-y-1.5">
        <Label>{t.lessons.fields.startDate}</Label>
        <DateField name="lesson_date" value={date} onChange={setDate} />
      </div>

      <div className="space-y-2 rounded-md border bg-muted/40 p-3">
        <p className="text-sm font-medium">{t.lessons.fields.timePerDay}</p>
        <div className="flex items-center gap-2">
          <TimeField
            ariaLabel={t.lessons.fields.start}
            value={range.start}
            onChange={setStart}
            required
          />
          <span aria-hidden className="text-muted-foreground">
            -
          </span>
          <TimeField
            ariaLabel={t.lessons.fields.end}
            value={range.end}
            onChange={(value) => setRange((current) => ({ ...current, end: value }))}
            required
          />
        </div>
        {badRange ? (
          <p role="alert" className="text-xs text-destructive">
            {t.lessons.timeRangeError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
