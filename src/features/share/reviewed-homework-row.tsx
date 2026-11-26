import { CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { focusRing, pressable } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ShareView } from "./queries";

type Homework = ShareView["homework"][number];

/**
 * A reviewed homework as a collapsed archive row — keeps finished work out of the
 * way of what still needs doing. Native <details> so it stays server-rendered,
 * keyboard-accessible, and dependency-free; the feedback/submission expand on tap.
 */
export function ReviewedHomeworkRow({ homework: hw }: { homework: Homework }) {
  return (
    <details className="group">
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-accent [&::-webkit-details-marker]:hidden",
          focusRing,
        )}
      >
        <CheckCircle2 className="size-5 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-medium">{hw.title}</p>
          {hw.feedback ? (
            <p className="truncate text-xs text-muted-foreground">
              {t.homework.feedback}: {hw.feedback}
            </p>
          ) : null}
        </div>
        <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>

      <div className="space-y-3 px-4 pb-4">
        {hw.attachmentSignedUrl || hw.submissionSignedUrl ? (
          <div className="flex flex-wrap gap-2">
            {hw.attachmentSignedUrl ? (
              <a
                href={hw.attachmentSignedUrl}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), pressable)}
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
                className={cn(buttonVariants({ size: "sm", variant: "outline" }), pressable)}
              >
                <ExternalLink className="size-4" />
                {t.homework.openSubmissionFile}
              </a>
            ) : null}
          </div>
        ) : null}

        {hw.submission_text ? (
          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">{t.homework.submission}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
              {hw.submission_text}
            </p>
          </div>
        ) : null}

        {hw.feedback ? (
          <div className="rounded-md border border-success/20 bg-success/10 p-3">
            <p className="text-sm font-medium text-success">{t.homework.feedback}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{hw.feedback}</p>
          </div>
        ) : null}
      </div>
    </details>
  );
}
