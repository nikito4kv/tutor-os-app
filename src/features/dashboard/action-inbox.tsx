import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck } from "lucide-react";
import { LessonDetailDialog } from "@/features/lessons/lesson-detail-dialog";
import { HomeworkStatusBadge } from "@/features/homework/homework-status-badge";
import { InboxColumn } from "./inbox-column";
import type { DashboardInbox, HomeworkInboxItem } from "./queries";
import type { LessonWithStudent } from "@/features/lessons/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/empty-state";
import { formatDateTime } from "@/lib/date";
import { focusRing } from "@/lib/styles";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

const ROW =
  "flex w-full flex-col items-start justify-between gap-2 rounded-md border px-3 py-2 text-left sm:flex-row sm:items-center sm:gap-3";

/** Primary/secondary text + a trailing badge — the shared inbox row body. */
function RowBody({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle: string;
  trailing: ReactNode;
}) {
  return (
    <>
      <div className="min-w-0">
        <p className="truncate font-medium">{title}</p>
        <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <span className="shrink-0">{trailing}</span>
    </>
  );
}

/** Homework row → links to the student's homework tab. */
function HomeworkRow({ item, badge }: { item: HomeworkInboxItem; badge: ReactNode }) {
  return (
    <Link
      href={`/students/${item.student_id}?tab=homework`}
      className={cn(ROW, "transition-colors hover:bg-accent", focusRing)}
    >
      <RowBody title={item.title} subtitle={item.studentName} trailing={badge} />
    </Link>
  );
}

/** Overdue lesson row → opens the lesson modal (complete / cancel live there). */
function OverdueLessonRow({ lesson }: { lesson: LessonWithStudent }) {
  return (
    <LessonDetailDialog lesson={lesson} studentName={lesson.student?.name ?? undefined}>
      <button type="button" className={cn(ROW, "transition-colors hover:bg-accent", focusRing)}>
        <RowBody
          title={lesson.student?.name ?? "—"}
          subtitle={`${formatDateTime(lesson.starts_at)}${lesson.topic ? ` · ${lesson.topic}` : ""}`}
          trailing={<Badge variant="warning">{t.lessons.overdue}</Badge>}
        />
      </button>
    </LessonDetailDialog>
  );
}

/**
 * "Ball is in your court" board: three colour-coded category columns —
 * homework to review (success), unfinished lessons (warning), overdue homework
 * (destructive). Each column previews a few rows and expands inline, so a long
 * feed spreads across the width instead of stacking into one tall column.
 */
export function ActionInbox({ inbox }: { inbox: DashboardInbox }) {
  if (inbox.total === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.dashboard.inbox}</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState icon={<CheckCircle2 className="size-6" />} title={t.dashboard.inboxEmpty} />
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        {t.dashboard.inbox}
        <Badge variant="secondary">{inbox.total}</Badge>
      </h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {inbox.toReview.length > 0 ? (
          <InboxColumn
            title={t.dashboard.toReview}
            accent="success"
            icon={<ClipboardCheck className="size-4" />}
            rows={inbox.toReview.map((item) => (
              <HomeworkRow
                key={item.id}
                item={item}
                badge={<HomeworkStatusBadge status={item.status} />}
              />
            ))}
          />
        ) : null}

        {inbox.overdueLessons.length > 0 ? (
          <InboxColumn
            title={t.dashboard.overdueLessons}
            accent="warning"
            icon={<CalendarClock className="size-4" />}
            rows={inbox.overdueLessons.map((lesson) => (
              <OverdueLessonRow key={lesson.id} lesson={lesson} />
            ))}
          />
        ) : null}

        {inbox.overdueHomework.length > 0 ? (
          <InboxColumn
            title={t.dashboard.overdueHomework}
            accent="destructive"
            icon={<AlertTriangle className="size-4" />}
            rows={inbox.overdueHomework.map((item) => (
              <HomeworkRow
                key={item.id}
                item={item}
                badge={<Badge variant="warning">{t.homework.overdue}</Badge>}
              />
            ))}
          />
        ) : null}
      </div>
    </section>
  );
}
