import { CalendarDays } from "lucide-react";
import { LessonList } from "@/features/lessons/lesson-list";
import type { LessonWithStudent } from "@/features/lessons/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { t } from "@/lib/i18n";

/** Today's lessons, in order. Each row opens the lesson modal (reuses LessonList). */
export function TodayLessons({ lessons }: { lessons: LessonWithStudent[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t.dashboard.today}</CardTitle>
      </CardHeader>
      <CardContent>
        {lessons.length === 0 ? (
          <EmptyState icon={<CalendarDays className="size-6" />} title={t.dashboard.todayEmpty} />
        ) : (
          <LessonList lessons={lessons} showStudent />
        )}
      </CardContent>
    </Card>
  );
}
