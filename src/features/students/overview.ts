/**
 * Pure aggregation helpers for the student-card overview. Free of Supabase/React
 * so they're trivially unit-testable (see overview.test.ts) — mirrors
 * features/dashboard/aggregate.ts.
 */
import type { LessonStatus } from "@/lib/supabase/database.types";

export interface ActivityLesson {
  starts_at: string;
  status: LessonStatus;
  topic: string | null;
}

export interface ActivityPayment {
  paid_at: string;
  amount: number;
}

export type ActivityEvent =
  | { kind: "lesson"; at: string; status: LessonStatus; topic: string | null }
  | { kind: "payment"; at: string; amount: number };

/** Nearest upcoming lesson (the list is already earliest-first), or null. */
export function pickNextLesson<T>(upcoming: T[]): T | null {
  return upcoming[0] ?? null;
}

/** Total of payment amounts — the student's "paid so far" figure. */
export function sumPaid(payments: { amount: number }[]): number {
  return payments.reduce((total, p) => total + p.amount, 0);
}

/**
 * One actionable item in the overview's "needs attention" zone. The teaching
 * to-dos only — money/balance lives in the vital strip (see docs spec, INV-X1).
 */
export type AttentionItem =
  | { kind: "review"; count: number } // homework submitted, awaiting the tutor's review
  | { kind: "overdue"; count: number } // student missed a deadline on unsubmitted homework
  | { kind: "noUpcoming" }; // no scheduled lesson ahead

export interface AttentionInput {
  toReview: number;
  overdue: number;
  noUpcoming: boolean;
}

/**
 * Build the attention zone's items in a fixed priority order: who's waiting on
 * the tutor (review) → who's slipping (overdue) → what to plan (no next lesson).
 * Pure → unit-testable; an empty array means "all clear".
 */
export function buildAttentionItems({
  toReview,
  overdue,
  noUpcoming,
}: AttentionInput): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (toReview > 0) items.push({ kind: "review", count: toReview });
  if (overdue > 0) items.push({ kind: "overdue", count: overdue });
  if (noUpcoming) items.push({ kind: "noUpcoming" });
  return items;
}

/**
 * Recent-activity feed: terminal lessons + the latest payment, merged and
 * sorted newest-first, capped at `limit`.
 */
export function buildActivityFeed(
  lessons: ActivityLesson[],
  payment: ActivityPayment | null,
  limit = 4,
): ActivityEvent[] {
  const events: ActivityEvent[] = lessons.map((l) => ({
    kind: "lesson",
    at: l.starts_at,
    status: l.status,
    topic: l.topic,
  }));
  if (payment) {
    events.push({ kind: "payment", at: payment.paid_at, amount: payment.amount });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
