import { CheckCircle2, ExternalLink } from "lucide-react";
import { HomeworkStatusBadge } from "@/features/homework/homework-status-badge";
import { isHomeworkOverdue } from "@/features/homework/deadline";
import { SubmitHomeworkDialog } from "./submit-homework-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { formatDateTime } from "@/lib/date";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { pressable } from "@/lib/styles";
import type { ShareView } from "./queries";

type Homework = ShareView["homework"][number];

/** A homework that still needs action (assigned or submitted). Compact summary
 *  with the submission form tucked behind the dialog. */
export function ActiveHomeworkCard({ homework: hw, token }: { homework: Homework; token: string }) {
  const overdue = isHomeworkOverdue(hw.due_at, hw.status);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {hw.status === "submitted" ? (
          <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm font-medium text-success">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{t.homework.submittedMessage}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-medium">{hw.title}</span>
          <HomeworkStatusBadge status={hw.status} />
        </div>

        {hw.due_at ? (
          <p
            className={cn(
              "text-sm font-medium",
              overdue ? "text-warning" : "text-muted-foreground",
            )}
          >
            {t.homework.due}: {formatDateTime(hw.due_at)}
            {overdue ? ` · ${t.homework.overdue}` : ""}
          </p>
        ) : null}

        {hw.description ? (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{hw.description}</p>
        ) : null}

        {hw.attachmentSignedUrl || hw.submissionSignedUrl ? (
          <div className="flex flex-wrap gap-2">
            {hw.attachmentSignedUrl ? (
              <a
                href={hw.attachmentSignedUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "min-h-11 sm:min-h-9",
                  pressable,
                )}
              >
                <ExternalLink className="size-4" />
                {t.homework.openAssignmentFile}
              </a>
            ) : null}
            {hw.submissionSignedUrl ? (
              <a
                href={hw.submissionSignedUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "min-h-11 sm:min-h-9",
                  pressable,
                )}
              >
                <ExternalLink className="size-4" />
                {t.homework.openSubmissionFile}
              </a>
            ) : null}
          </div>
        ) : null}

        {hw.status === "submitted" && hw.submission_text ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">{t.homework.submission}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {hw.submission_text}
            </p>
          </div>
        ) : null}

        <SubmitHomeworkDialog
          token={token}
          homeworkId={hw.id}
          status={hw.status}
          defaultText={hw.submission_text}
        />
      </CardContent>
    </Card>
  );
}
