"use client";

import { formatDateTime } from "@/lib/date";
import { Pagination, usePaginated } from "@/components/states/pagination";
import { t } from "@/lib/i18n";
import type { Feedback } from "./queries";
import { FeedbackCategoryBadge } from "./feedback-category-badge";
import { FeedbackStatusSelect } from "./feedback-status-select";

export function FeedbackList({ items }: { items: Feedback[] }) {
  const { page, setPage, pageSize, setPageSize, total, pageItems } = usePaginated(items);

  return (
    <div className="space-y-4">
      <ul className="divide-y rounded-md border">
        {pageItems.map((f) => (
          <li
            key={f.id}
            className="flex flex-col items-start justify-between gap-4 p-4 sm:flex-row"
          >
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <FeedbackCategoryBadge category={f.category} />
                <span className="text-xs text-muted-foreground">
                  {f.tutor_id ? t.admin.feedback.registered : t.admin.feedback.anonymous}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(f.created_at)}
                </span>
              </div>
              <p className="max-w-prose whitespace-pre-wrap break-words text-sm">{f.message}</p>
              {f.contact ? (
                <p className="text-xs text-muted-foreground">
                  {t.admin.feedback.contact}: <span className="text-foreground">{f.contact}</span>
                </p>
              ) : null}
              {f.page_url ? (
                <p className="truncate text-xs text-muted-foreground">
                  {t.admin.feedback.page}: {f.page_url}
                </p>
              ) : null}
            </div>
            <div className="w-full sm:w-auto">
              <FeedbackStatusSelect feedbackId={f.id} status={f.status} />
            </div>
          </li>
        ))}
      </ul>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
}
