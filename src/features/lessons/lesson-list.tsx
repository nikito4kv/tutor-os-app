import { LessonDetailDialog } from "./lesson-detail-dialog";
import { LessonStatusBadge } from "./lesson-status-badge";
import { isLessonOverdue } from "./overdue";
import type { Lesson, LessonWithStudent } from "./queries";
import { Badge } from "@/components/ui/badge";
import { formatDayLabel, formatTime, groupLessonsByDay, isSameDay } from "@/lib/date";
import { lessonAccent } from "@/lib/lesson-colors";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

type ListLesson = Lesson | LessonWithStudent;

function studentName(lesson: ListLesson): string | null {
  return "student" in lesson ? (lesson.student?.name ?? null) : null;
}

/**
 * Lessons grouped by day. Each row opens the lesson detail modal (complete /
 * edit / cancel / delete live there). Set `showStudent` to surface the student
 * name; `order="desc"` lists newest-first (history view).
 */
export function LessonList({
  lessons,
  showStudent = false,
  order = "asc",
}: {
  lessons: ListLesson[];
  showStudent?: boolean;
  order?: "asc" | "desc";
}) {
  const groups = groupLessonsByDay(lessons, order === "desc");
  const now = Date.now();
  const today = new Date(now);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.date.toISOString()} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {formatDayLabel(group.date)}
          </h3>
          <ul className="divide-y rounded-md border">
            {group.items.map((lesson) => {
              const name = studentName(lesson);
              return (
                <li key={lesson.id}>
                  <LessonDetailDialog lesson={lesson} studentName={name ?? undefined}>
                    <button
                      type="button"
                      data-onboarding-target={
                        lesson.status === "scheduled" ? "lesson-row" : undefined
                      }
                      style={lessonAccent(lesson.color)}
                      className={cn(
                        "flex w-full flex-col items-start justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-3",
                        lessonAccent(lesson.color) && "border-l-[3px]",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="break-words font-medium">
                          {formatTime(lesson.starts_at)}
                          {lesson.topic ? ` · ${lesson.topic}` : ""}
                        </p>
                        {showStudent && name ? (
                          <p className="truncate text-sm text-muted-foreground">{name}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0">
                        {isLessonOverdue(lesson, now) ? (
                          <Badge variant="warning">{t.lessons.overdue}</Badge>
                        ) : lesson.status === "scheduled" &&
                          isSameDay(new Date(lesson.starts_at), today) ? (
                          <Badge>{t.lessons.today}</Badge>
                        ) : (
                          <LessonStatusBadge status={lesson.status} />
                        )}
                      </span>
                    </button>
                  </LessonDetailDialog>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
