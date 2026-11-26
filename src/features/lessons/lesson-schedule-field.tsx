"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DateField } from "@/components/date-field";
import { TimeField } from "@/components/time-field";
import {
  DEFAULT_LESSON_DURATION_MIN,
  DEFAULT_LESSON_TIME,
  DEFAULT_RECURRENCE_COUNT,
  MAX_RECURRENCE_OCCURRENCES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

type Repeat = "none" | "weekly" | "biweekly";
type EndKind = "count" | "until";
type DayTime = { start: string; end: string };

const selectClass =
  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function isTimeValue(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

/** "HH:mm" + minutes, wrapping within a day. Used for the default end time. */
function addMinutes(hhmm: string, mins: number): string {
  const total = (((toMinutes(hhmm) + mins) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Mon-based weekday index (0..6) of a local Date. */
function weekdayOf(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const DEFAULT_DAY_TIME: DayTime = {
  start: DEFAULT_LESSON_TIME,
  end: addMinutes(DEFAULT_LESSON_TIME, DEFAULT_LESSON_DURATION_MIN),
};

/**
 * The scheduling block of the add-lesson form: start date → weekday chips →
 * a start/end time per selected day → repeat cadence → series end → a live hint.
 * Emits the `start_date`, `repeat`, `repeat_weekday[]`, `start_<d>`/`end_<d>` and
 * `repeat_*` fields the server action (`createLessonAction`) expands. Each
 * selected weekday becomes its own series (own time/duration); the duration is
 * derived as end − start. See docs/MVP.md.
 */
export function LessonScheduleField({ defaultDate }: { defaultDate: Date }) {
  const [startDate, setStartDate] = React.useState<Date>(defaultDate);
  const [days, setDays] = React.useState<Set<number>>(() => new Set([weekdayOf(defaultDate)]));
  const [times, setTimes] = React.useState<Record<number, DayTime>>(() => {
    const init: Record<number, DayTime> = {};
    for (let d = 0; d < 7; d += 1) init[d] = { ...DEFAULT_DAY_TIME };
    return init;
  });
  const [repeat, setRepeat] = React.useState<Repeat>("weekly");
  const [endKind, setEndKind] = React.useState<EndKind>("count");
  const [count, setCount] = React.useState(String(DEFAULT_RECURRENCE_COUNT));
  const [untilDate, setUntilDate] = React.useState<Date | undefined>(undefined);

  const selectedDays = React.useMemo(() => [...days].sort((a, b) => a - b), [days]);

  function toggleDay(d: number) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function setDayTime(d: number, part: keyof DayTime, value: string) {
    setTimes((prev) => {
      const current = prev[d] ?? DEFAULT_DAY_TIME;
      const updated: DayTime =
        part === "start"
          ? {
              ...current,
              start: value,
              end: isTimeValue(value)
                ? addMinutes(value, DEFAULT_LESSON_DURATION_MIN)
                : current.end,
            }
          : { ...current, end: value };
      return { ...prev, [d]: updated };
    });
  }

  /** Times for a day — all 7 are pre-seeded, so the fallback never triggers. */
  const timeOf = (d: number): DayTime => times[d] ?? DEFAULT_DAY_TIME;

  const repeating = repeat !== "none";

  // Hint: only meaningful for a recurring lesson. Collapse to a single range when
  // every selected day shares the same time (matches the mockup); otherwise the
  // per-day rows above already spell out the schedule.
  const hint = React.useMemo(() => {
    if (!repeating || selectedDays.length === 0) return "";
    const prefix =
      repeat === "weekly" ? t.lessons.recurrence.hintWeekly : t.lessons.recurrence.hintBiweekly;
    const dayList = selectedDays.map((d) => t.lessons.weekdaysShort[d]).join(", ");
    const first = times[selectedDays[0] ?? 0] ?? DEFAULT_DAY_TIME;
    const uniform = selectedDays.every((d) => {
      const x = times[d] ?? DEFAULT_DAY_TIME;
      return x.start === first.start && x.end === first.end;
    });
    const range = uniform
      ? ` ${t.lessons.timeFrom} ${first.start} ${t.lessons.timeTo} ${first.end}`
      : "";
    return `${prefix}: ${dayList}${range}`;
  }, [repeating, repeat, selectedDays, times]);

  return (
    <div className="space-y-4">
      {/* Дата начала */}
      <div className="space-y-1.5">
        <Label>{t.lessons.fields.startDate}</Label>
        <DateField name="start_date" value={startDate} onChange={setStartDate} />
      </div>

      {/* Дни недели */}
      <div className="space-y-1.5">
        <Label>{t.lessons.fields.daysOfWeek}</Label>
        <div role="group" aria-label={t.lessons.fields.daysOfWeek} className="flex flex-wrap gap-2">
          {t.lessons.weekdaysShort.map((label, d) => {
            const active = days.has(d);
            return (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                onClick={() => toggleDay(d)}
                className="min-h-11 min-w-11"
              >
                {label}
              </Button>
            );
          })}
        </div>
        {selectedDays.length === 0 ? (
          <p role="alert" className="text-sm text-destructive">
            {t.lessons.pickDayError}
          </p>
        ) : null}
      </div>

      {/* Время для выбранных дней */}
      {selectedDays.length > 0 ? (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3">
          <p className="text-sm font-medium">{t.lessons.fields.timePerDay}</p>
          {selectedDays.map((d) => {
            const dt = timeOf(d);
            const badRange = toMinutes(dt.end) <= toMinutes(dt.start);
            return (
              <div key={d} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-sm font-medium text-muted-foreground">
                    {t.lessons.weekdaysShort[d]}
                  </span>
                  <TimeField
                    ariaLabel={`${t.lessons.weekdaysShort[d]} — ${t.lessons.fields.start}`}
                    value={dt.start}
                    onChange={(value) => setDayTime(d, "start", value)}
                  />
                  <span aria-hidden className="text-muted-foreground">
                    –
                  </span>
                  <TimeField
                    ariaLabel={`${t.lessons.weekdaysShort[d]} — ${t.lessons.fields.end}`}
                    value={dt.end}
                    onChange={(value) => setDayTime(d, "end", value)}
                  />
                  {/* Submitted fields the server action expands per weekday. */}
                  <input type="hidden" name="repeat_weekday" value={d} />
                  <input type="hidden" name={`start_${d}`} value={dt.start} />
                  <input type="hidden" name={`end_${d}`} value={dt.end} />
                </div>
                {badRange ? (
                  <p role="alert" className="pl-9 text-xs text-destructive">
                    {t.lessons.timeRangeError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Повтор */}
      <div className="space-y-1.5">
        <Label htmlFor="repeat">{t.lessons.recurrence.label}</Label>
        <select
          id="repeat"
          name="repeat"
          value={repeat}
          onChange={(e) => setRepeat(e.target.value as Repeat)}
          className={selectClass}
        >
          <option value="none">{t.lessons.recurrence.none}</option>
          <option value="weekly">{t.lessons.recurrence.everyWeek}</option>
          <option value="biweekly">{t.lessons.recurrence.everyTwoWeeks}</option>
        </select>
      </div>

      {/* Окончание серии — только при повторе */}
      {repeating ? (
        <div className="space-y-2">
          <input type="hidden" name="repeat_end" value={endKind} />

          <div
            role="group"
            aria-label={t.lessons.recurrence.endTitle}
            className="grid h-11 grid-cols-2 gap-1 rounded-md border border-input bg-muted p-1"
          >
            <button
              type="button"
              aria-pressed={endKind === "count"}
              onClick={() => setEndKind("count")}
              className={cn(
                "rounded-sm text-sm font-medium transition-colors motion-reduce:transition-none",
                endKind === "count"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.lessons.recurrence.endsAfterFull}
            </button>
            <button
              type="button"
              aria-pressed={endKind === "until"}
              onClick={() => setEndKind("until")}
              className={cn(
                "rounded-sm text-sm font-medium transition-colors motion-reduce:transition-none",
                endKind === "until"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.lessons.recurrence.endsOn}
            </button>
          </div>

          {endKind === "count" ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                name="repeat_count"
                min={1}
                max={MAX_RECURRENCE_OCCURRENCES}
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="h-11 w-24"
              />
              <span className="text-sm text-muted-foreground">
                {t.lessons.recurrence.occurrences}
              </span>
            </div>
          ) : (
            <DateField name="repeat_until" value={untilDate} onChange={setUntilDate} />
          )}
        </div>
      ) : null}

      {/* Подсказка */}
      {hint ? (
        <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary">{hint}</p>
      ) : null}
    </div>
  );
}
