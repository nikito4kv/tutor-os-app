import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { SectionHeading } from "./section-heading";
import {
  formatWhenLabel,
  formatRelativeToNow,
  formatDayLabel,
  formatTime,
  isSameDay,
  addDays,
} from "@/lib/date";
import { t } from "@/lib/i18n";
import type { ShareView } from "./queries";

type Lesson = ShareView["upcomingLessons"][number];

/**
 * Schedule with a clear "what's next" focus: the nearest lesson is promoted to a
 * highlight card (relative + absolute label, like the tutor dashboard hero), the
 * rest collapse into a compact list (DESIGN §6) instead of N identical cards.
 */
export function ScheduleSection({ lessons }: { lessons: Lesson[] }) {
  const [next, ...rest] = lessons;

  return (
    <section className="space-y-3">
      <SectionHeading title={t.nav.schedule} count={lessons.length} />
      {lessons.length === 0 ? (
        <EmptyState title={t.share.noLessons} />
      ) : (
        <>
          {next ? <NextLessonHighlight lesson={next} /> : null}
          {rest.length > 0 ? (
            <ul className="divide-y rounded-md border">
              {rest.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="text-base">{l.topic || t.common.lesson}</span>
                  <span className="text-sm text-muted-foreground">
                    {formatDayLabel(new Date(l.starts_at))} · {formatTime(l.starts_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  );
}

function NextLessonHighlight({ lesson }: { lesson: Lesson }) {
  // "Завтра, 17:00" already says "завтра", so the relative badge would only echo
  // it. For today (через 2 ч.) and later dates (через 5 дн.) it adds real info.
  const start = new Date(lesson.starts_at);
  const echoesAbsolute = isSameDay(start, addDays(new Date(), 1));

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{t.share.nextLesson}</p>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CalendarClock className="size-5 shrink-0 text-primary" />
            <span className="truncate text-base font-medium">
              {lesson.topic || t.common.lesson}
            </span>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-base font-medium">{formatWhenLabel(lesson.starts_at)}</div>
            {echoesAbsolute ? null : (
              <Badge variant="secondary" className="mt-1">
                {formatRelativeToNow(lesson.starts_at)}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
