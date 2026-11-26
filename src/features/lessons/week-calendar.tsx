import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { addDays, formatDayLabel, formatTime, isSameDay, toDateKey } from "@/lib/date";
import { lessonAccent } from "@/lib/lesson-colors";
import { t } from "@/lib/i18n";
import { LessonDetailDialog } from "./lesson-detail-dialog";
import { LessonStatusBadge } from "./lesson-status-badge";
import { isLessonOverdue } from "./overdue";
import type { LessonWithStudent } from "./queries";

const MAX_VISIBLE_LESSONS = 3;

/** 7-column week grid (Mon–Sun). Each cell lists that day's lessons as chips. */
export function WeekCalendar({
  weekStart,
  today,
  lessons,
}: {
  weekStart: Date;
  today: Date;
  lessons: LessonWithStudent[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekKey = toDateKey(weekStart);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-7">
      {days.map((day) => {
        const dayLessons = lessons.filter((l) => isSameDay(new Date(l.starts_at), day));
        const visibleLessons = dayLessons.slice(0, MAX_VISIBLE_LESSONS);
        const hiddenCount = dayLessons.length - visibleLessons.length;
        const isToday = isSameDay(day, today);
        return (
          <div key={day.toISOString()} className="rounded-md border">
            <Link
              href={`/schedule?view=week&week=${weekKey}&day=${toDateKey(day)}`}
              className={cn(
                "flex items-center justify-between gap-2 border-b px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isToday ? "bg-primary/10 text-foreground" : "text-muted-foreground",
              )}
            >
              <span>
                {formatDayLabel(day)}
                {isToday ? <span className="ml-1 text-xs">· {t.lessons.today}</span> : null}
              </span>
              {dayLessons.length > 0 ? (
                <Badge variant="secondary">{dayLessons.length}</Badge>
              ) : null}
            </Link>
            <ul className="space-y-2 p-2">
              {visibleLessons.map((lesson) => (
                <li key={lesson.id}>
                  <LessonDetailDialog
                    lesson={lesson}
                    studentName={lesson.student?.name ?? undefined}
                  >
                    <button
                      type="button"
                      data-onboarding-target={
                        lesson.status === "scheduled" ? "lesson-row" : undefined
                      }
                      style={lessonAccent(lesson.color)}
                      className={cn(
                        "block w-full rounded-md border bg-card px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        lessonAccent(lesson.color) && "border-l-[3px]",
                        lesson.status === "canceled" && "opacity-60",
                      )}
                    >
                      <span className="font-medium">{formatTime(lesson.starts_at)}</span>{" "}
                      {lesson.student?.name ?? ""}
                      {lesson.topic ? (
                        <span className="block text-muted-foreground">{lesson.topic}</span>
                      ) : null}
                      {lesson.status !== "scheduled" ? (
                        <span className="mt-1 block">
                          <LessonStatusBadge status={lesson.status} />
                        </span>
                      ) : isLessonOverdue(lesson, today.getTime()) ? (
                        <span className="mt-1 block">
                          <Badge variant="warning">{t.lessons.overdue}</Badge>
                        </span>
                      ) : null}
                    </button>
                  </LessonDetailDialog>
                </li>
              ))}
              {hiddenCount > 0 ? (
                <li>
                  <Link
                    href={`/schedule?view=week&week=${weekKey}&day=${toDateKey(day)}`}
                    className="block rounded-md border border-dashed px-2 py-1.5 text-center text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {t.lessons.moreLessons(hiddenCount)}
                  </Link>
                </li>
              ) : null}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
