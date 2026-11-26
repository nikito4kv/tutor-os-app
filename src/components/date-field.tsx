"use client";

import * as React from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { addDays, toDateKey } from "@/lib/date";
import { t } from "@/lib/i18n";

/**
 * Date-only picker (no time): a Calendar popover + one-tap day chips, emitting a
 * hidden `<input name>` in local "YYYY-MM-DD" form. Controlled — the parent owns
 * the value so it can derive things from it (e.g. the default weekday). The
 * combined date+time picker lives in date-time-field.tsx for edit/reschedule.
 */
export function DateField({
  name,
  value,
  onChange,
}: {
  name: string;
  value: Date | undefined;
  onChange: (d: Date) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(value ?? new Date());

  React.useEffect(() => {
    if (value) setMonth(value);
  }, [value]);

  function pick(d: Date | undefined) {
    if (d) {
      onChange(d);
      setMonth(d);
    }
    setOpen(false);
  }

  function quickPick(d: Date) {
    onChange(d);
    setMonth(d);
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value ? toDateKey(value) : ""} />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "min-h-11 w-full justify-start gap-2 font-normal",
              !value && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="size-4" />
            {value ? format(value, "d MMMM yyyy", { locale: ru }) : t.common.dateTime.pickDate}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto">
          <Calendar
            mode="single"
            selected={value}
            month={month}
            onMonthChange={setMonth}
            onSelect={pick}
            autoFocus
          />
        </PopoverContent>
      </Popover>

      <div className="flex flex-wrap gap-2">
        <Chip onClick={() => quickPick(new Date())}>{t.common.dateTime.today}</Chip>
        <Chip onClick={() => quickPick(addDays(new Date(), 1))}>{t.common.dateTime.tomorrow}</Chip>
        <Chip onClick={() => quickPick(addDays(new Date(), 7))}>{t.common.dateTime.nextWeek}</Chip>
      </div>
    </div>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={onClick}>
      {children}
    </Button>
  );
}
