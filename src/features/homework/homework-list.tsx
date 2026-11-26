import { CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/states/empty-state";
import { formatDate, formatDateTime } from "@/lib/date";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { HomeworkStatusBadge } from "./homework-status-badge";
import { ReviewHomework } from "./review-homework";
import { isHomeworkOverdue } from "./deadline";
import type { Homework } from "./queries";

export function HomeworkList({ studentId, homework }: { studentId: string; homework: Homework[] }) {
  if (homework.length === 0) {
    return <EmptyState title={t.common.emptyDefault} description={t.homework.empty} />;
  }

  const now = Date.now();
  const active = homework.filter((item) => item.status !== "reviewed");
  const reviewed = homework.filter((item) => item.status === "reviewed");

  return (
    <div className="space-y-3">
      {active.map((item) => (
        <ActiveHomeworkItem key={item.id} studentId={studentId} item={item} now={now} />
      ))}

      {reviewed.length > 0 ? (
        <Card className="divide-y overflow-hidden">
          {reviewed.map((item) => (
            <ReviewedHomeworkItem key={item.id} item={item} />
          ))}
        </Card>
      ) : null}
    </div>
  );
}

function ActiveHomeworkItem({
  studentId,
  item,
  now,
}: {
  studentId: string;
  item: Homework;
  now: number;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row">
          <div className="min-w-0">
            <p className="font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
            {item.due_at ? (
              <p
                className={cn(
                  "text-sm font-medium",
                  isHomeworkOverdue(item.due_at, item.status, now)
                    ? "text-warning"
                    : "text-muted-foreground",
                )}
              >
                {t.homework.due}: {formatDateTime(item.due_at)}
                {isHomeworkOverdue(item.due_at, item.status, now) ? ` · ${t.homework.overdue}` : ""}
              </p>
            ) : null}
          </div>
          <span className="shrink-0">
            <HomeworkStatusBadge status={item.status} />
          </span>
        </div>

        {item.description ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
        ) : null}

        <HomeworkFiles item={item} />

        {item.submission_text ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">{t.homework.submission}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.submission_text}
            </p>
          </div>
        ) : null}

        {item.status === "submitted" ? (
          <ReviewHomework
            studentId={studentId}
            homeworkId={item.id}
            defaultFeedback={item.feedback}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReviewedHomeworkItem({ item }: { item: Homework }) {
  return (
    <details className="group">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-start gap-3 px-4 py-3 sm:items-center [&::-webkit-details-marker]:hidden",
          focusRing,
        )}
      >
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {item.feedback
              ? `${t.homework.feedback}: ${item.feedback}`
              : formatDate(item.created_at)}
          </p>
        </div>
        <span className="hidden shrink-0 sm:inline-flex">
          <HomeworkStatusBadge status={item.status} />
        </span>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-3 px-4 pb-4">
        <HomeworkFiles item={item} />

        {item.submission_text ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">{t.homework.submission}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.submission_text}
            </p>
          </div>
        ) : null}

        {item.feedback ? (
          <div className="rounded-md border border-success/20 bg-success/10 p-3">
            <p className="text-sm font-medium text-success">{t.homework.feedback}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{item.feedback}</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}

function HomeworkFiles({ item }: { item: Homework }) {
  if (!item.attachmentSignedUrl && !item.submissionSignedUrl) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {item.attachmentSignedUrl ? (
        <a
          href={item.attachmentSignedUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <ExternalLink className="size-4" />
          {t.homework.openAssignmentFile}
        </a>
      ) : null}
      {item.submissionSignedUrl ? (
        <a
          href={item.submissionSignedUrl}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          <ExternalLink className="size-4" />
          {t.homework.openSubmissionFile}
        </a>
      ) : null}
    </div>
  );
}
