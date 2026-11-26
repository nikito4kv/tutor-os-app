"use client";

import * as React from "react";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DEFAULT_LESSON_TIME } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTE_PRESETS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));

function minuteOptions(selected: string): string[] {
  return MINUTE_PRESETS.includes(selected)
    ? MINUTE_PRESETS
    : [...MINUTE_PRESETS, selected].sort((a, b) => Number(a) - Number(b));
}

function splitTime(value: string): { hour: string; minute: string } {
  const [hour, minute] = (value || DEFAULT_LESSON_TIME).split(":");
  return {
    hour: HOURS.includes(hour ?? "") ? (hour ?? "18") : "18",
    minute: /^\d{2}$/.test(minute ?? "") ? (minute ?? "00") : "00",
  };
}

export function TimeField({
  value,
  onChange,
  ariaLabel,
  required = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const { hour, minute } = splitTime(value);
  const minutes = React.useMemo(() => minuteOptions(minute), [minute]);

  function choose(nextHour: string, nextMinute: string) {
    onChange(`${nextHour}:${nextMinute}`);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          aria-required={required}
          className={cn(
            "h-11 w-28 justify-start gap-2 px-3 font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <Clock className="size-4" />
          <span className="tabular-nums">{value || DEFAULT_LESSON_TIME}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="grid grid-cols-2 gap-2">
          <TimeColumn
            label={t.common.dateTime.hours}
            values={HOURS}
            selected={hour}
            open={open}
            onSelect={(nextHour) => choose(nextHour, minute)}
          />
          <TimeColumn
            label={t.common.dateTime.minutes}
            values={minutes}
            selected={minute}
            open={open}
            onSelect={(nextMinute) => choose(hour, nextMinute)}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimeColumn({
  label,
  values,
  selected,
  open,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  open: boolean;
  onSelect: (value: string) => void;
}) {
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const active = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    active?.scrollIntoView({ block: "center" });
  }, [open, selected]);

  return (
    <div className="space-y-1">
      <p className="px-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div
        ref={listRef}
        className="max-h-56 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onWheel={(event) => event.stopPropagation()}
      >
        {values.map((value) => {
          const active = value === selected;
          return (
            <button
              key={value}
              type="button"
              data-selected={active}
              onClick={() => onSelect(value)}
              className={cn(
                "flex h-9 w-full items-center justify-between rounded px-2 text-sm tabular-nums transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {value}
              {active ? <Check className="size-4" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
