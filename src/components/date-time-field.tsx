"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TimeField } from "@/components/time-field";
import { cn } from "@/lib/utils";
import { addDays } from "@/lib/date";
import { DEFAULT_LESSON_TIME, TIME_PRESETS } from "@/lib/constants";
import { t } from "@/lib/i18n";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** A Date → "YYYY-MM-DDTHH:mm" (local, no zone) — same shape as datetime-local. */
function toLocalInputValue(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function dateOnly(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function timeOf(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Date + time picker that emits a hidden `<input name>` in the local
 * "YYYY-MM-DDTHH:mm" format — identical to a native datetime-local, so server
 * schemas (`z.coerce.date`) need no change. Date via a Calendar popover, time
 * via a native time field, plus one-tap day/time chips. Reused by add/edit
 * lesson, reschedule and the homework deadline. See docs/DESIGN.md.
 */
export function DateTimeField({
  name = "starts_at",
  defaultValue,
  required = true,
}: {
  name?: string;
  /** Initial value; when omitted the field starts empty. */
  defaultValue?: Date;
  required?: boolean;
}) {
  const [date, setDate] = React.useState<Date | undefined>(
    defaultValue ? dateOnly(defaultValue) : undefined,
  );
  const [time, setTime] = React.useState<string>(defaultValue ? timeOf(defaultValue) : "");
  const [month, setMonth] = React.useState(defaultValue ? dateOnly(defaultValue) : new Date());
  const [open, setOpen] = React.useState(false);

  const hiddenValue = React.useMemo(() => {
    if (!date || !time) return "";
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return toLocalInputValue(d);
  }, [date, time]);

  function pickDate(d: Date | undefined) {
    const picked = d ? dateOnly(d) : undefined;
    setDate(picked);
    if (picked) setMonth(picked);
    if (d && !time) setTime(DEFAULT_LESSON_TIME);
    setOpen(false);
  }

  function quickDate(daysFromToday: number) {
    const picked = dateOnly(addDays(new Date(), daysFromToday));
    setDate(picked);
    setMonth(picked);
    if (!time) setTime(DEFAULT_LESSON_TIME);
  }

  return (
    <div className="space-y-2">
      {/* Hidden inputs are exempt from constraint validation; the server schema
          is the backstop for a cleared date or time. */}
      <input type="hidden" name={name} value={hiddenValue} />

      <div className="flex flex-wrap gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "min-h-11 justify-start gap-2 font-normal",
                !date && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-4" />
              {date ? format(date, "d MMMM yyyy", { locale: ru }) : t.common.dateTime.pickDate}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto">
            <Calendar
              mode="single"
              selected={date}
              month={month}
              onMonthChange={setMonth}
              onSelect={pickDate}
              autoFocus
            />
          </PopoverContent>
        </Popover>

        <TimeField
          value={time}
          onChange={setTime}
          ariaLabel={t.common.dateTime.time}
          required={required}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip onClick={() => quickDate(0)}>{t.common.dateTime.today}</Chip>
        <Chip onClick={() => quickDate(1)}>{t.common.dateTime.tomorrow}</Chip>
        <Chip onClick={() => quickDate(7)}>{t.common.dateTime.nextWeek}</Chip>
      </div>

      <div className="flex flex-wrap gap-2">
        {TIME_PRESETS.map((preset) => (
          <Chip key={preset} active={time === preset} onClick={() => setTime(preset)}>
            {preset}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  children,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className="min-h-11"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
