"use client";

import { useOptimistic, useState, useTransition, type ChangeEvent } from "react";
import { t } from "@/lib/i18n";
import { setFeedbackStatusAction } from "./actions";
import { FEEDBACK_STATUSES, type FeedbackStatus } from "./schema";

/**
 * Inline status triage. Native <select> auto-submits on change. We hold the chosen
 * value with `useOptimistic` inside the action transition: it shows the new status
 * immediately and reverts only if the server data comes back different — so the old
 * status (e.g. «новое») never flashes between the click and the revalidation.
 */
export function FeedbackStatusSelect({
  feedbackId,
  status,
}: {
  feedbackId: string;
  status: FeedbackStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic<FeedbackStatus>(status);
  const [error, setError] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as FeedbackStatus;
    startTransition(async () => {
      setOptimistic(next); // оптимистично — старый статус не мигает
      const result = await setFeedbackStatusAction(feedbackId, next);
      setError(result.error ?? null);
    });
  }

  return (
    <div className="w-full shrink-0 sm:w-auto">
      <label htmlFor={`status-${feedbackId}`} className="sr-only">
        {t.admin.feedback.title}
      </label>
      <select
        id={`status-${feedbackId}`}
        name="status"
        value={optimistic}
        disabled={isPending}
        onChange={handleChange}
        className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto"
      >
        {FEEDBACK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t.admin.feedback.statuses[s]}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
