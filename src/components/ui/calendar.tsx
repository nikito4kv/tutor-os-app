"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { ru } from "date-fns/locale";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const DEFAULT_START_MONTH = new Date(1900, 0);
const DEFAULT_END_MONTH = new Date(2100, 11);

/**
 * Month grid date picker (shadcn-style, on react-day-picker v10). Fully styled
 * via `classNames` with semantic tokens — no base stylesheet import. Locale is
 * ru (date-fns). Lucide chevrons via the `Chevron` component override.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  startMonth,
  endMonth,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={ru}
      showOutsideDays={showOutsideDays}
      startMonth={startMonth ?? DEFAULT_START_MONTH}
      endMonth={endMonth ?? DEFAULT_END_MONTH}
      className={cn("p-0", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "relative z-0 flex h-9 items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "pointer-events-none absolute inset-x-0 top-1 z-10 flex items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "pointer-events-auto size-7 bg-transparent p-0 opacity-70 hover:opacity-100 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "icon" }),
          "pointer-events-auto size-7 bg-transparent p-0 opacity-70 hover:opacity-100 aria-disabled:pointer-events-none aria-disabled:opacity-50",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-xs font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground",
        today: "[&>button]:bg-accent [&>button]:text-accent-foreground",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="size-4" />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
