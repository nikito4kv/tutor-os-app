import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  addDays,
  formatTime,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "@/lib/date";
import { lessonAccent } from "@/lib/lesson-colors";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { LessonStatusBadge } from "./lesson-status-badge";
import { isLessonOverdue } from "./overdue";
import type { LessonWithStudent } from "./queries";

const MAX_VISIBLE_LESSONS = 3;

/** Month grid (Mon-Sun). A day cell links to the expanded day schedule. */
export function MonthCalendar({
  monthStart,
  today,
  lessons,
}: {
  monthStart: Date;
  today: Date;
  lessons: LessonWithStudent[];
}) {
  const firstGridDay = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, index) => addDays(firstGridDay, index));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground sm:text-xs">
        {t.lessons.weekdaysShort.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 md:gap-2">
        {days.map((day) => {
          const dayLessons = lessons.filter((lesson) => isSameDay(new Date(lesson.starts_at), day));
          const currentMonth = isSameMonth(day, monthStart);
          const currentDay = isSameDay(day, today);
          const visibleLessons = dayLessons.slice(0, MAX_VISIBLE_LESSONS);
          const dayMonthKey = toDateKey(startOfMonth(day));

          return (
            <Link
              key={day.toISOString()}
              href={`/schedule?view=month&month=${dayMonthKey}&day=${toDateKey(day)}`}
              className={cn(
                "min-h-16 rounded-md border bg-card p-1.5 transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-20 md:min-h-28 md:p-2",
                !currentMonth && "opacity-55",
                currentDay && "border-primary bg-primary/10",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium sm:text-sm">{day.getDate()}</span>
                {dayLessons.length > 0 ? (
                  <Badge
                    variant={currentDay ? "default" : "secondary"}
                    className="h-5 min-w-5 px-1 text-[10px] sm:h-6 sm:min-w-6 sm:text-xs"
                  >
                    {dayLessons.length}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-2 hidden space-y-1 md:block">
                {visibleLessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    style={lessonAccent(lesson.color)}
                    className={cn(
                      "rounded-md border bg-card px-2 py-1 text-xs",
                      lessonAccent(lesson.color) && "border-l-[3px]",
                      lesson.status === "canceled" && "opacity-60",
                    )}
                  >
                    <p className="truncate">
                      <span className="font-medium">{formatTime(lesson.starts_at)}</span>{" "}
                      <span className="text-muted-foreground">{lesson.student?.name}</span>
                    </p>
                    {lesson.status !== "scheduled" ? (
                      <span className="mt-1 block">
                        <LessonStatusBadge status={lesson.status} />
                      </span>
                    ) : isLessonOverdue(lesson, today.getTime()) ? (
                      <span className="mt-1 block">
                        <Badge variant="warning">{t.lessons.overdue}</Badge>
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
