import { CalendarClock } from "lucide-react";
import { LessonDetailDialog } from "@/features/lessons/lesson-detail-dialog";
import type { LessonWithStudent } from "@/features/lessons/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { formatRelativeToNow, formatWhenLabel } from "@/lib/date";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/** Hero card: the nearest upcoming lesson with a relative countdown; opens the lesson modal. */
export function NextLessonCard({ lesson }: { lesson: LessonWithStudent | null }) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {t.dashboard.nextLesson}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!lesson ? (
          <EmptyState
            icon={<CalendarClock className="size-6" />}
            title={t.dashboard.noNextLesson}
          />
        ) : (
          <LessonDetailDialog lesson={lesson} studentName={lesson.student?.name ?? undefined}>
            <button
              type="button"
              className={cn(
                "flex w-full flex-col gap-2 rounded-md p-2 text-left transition-colors hover:bg-accent",
                focusRing,
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl font-semibold">{lesson.student?.name ?? "—"}</span>
                <Badge variant="secondary">{formatRelativeToNow(lesson.starts_at)}</Badge>
              </div>
              <p className="text-muted-foreground">
                {formatWhenLabel(lesson.starts_at)}
                {lesson.topic ? ` · ${lesson.topic}` : ""}
              </p>
            </button>
          </LessonDetailDialog>
        )}
      </CardContent>
    </Card>
  );
}
