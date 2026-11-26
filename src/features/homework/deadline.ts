import type { HomeworkStatus } from "@/lib/supabase/database.types";

/**
 * A homework deadline is "overdue" when it has passed and the work isn't
 * reviewed yet. Drives the warning colour for the due date (so a far-off
 * deadline isn't shown as alarming). Time is naive-local like the rest of the MVP.
 */
export function isHomeworkOverdue(
  dueAt: string | null,
  status: HomeworkStatus,
  now: number = Date.now(),
): boolean {
  if (!dueAt) return false;
  if (status === "reviewed") return false;
  return new Date(dueAt).getTime() < now;
}
