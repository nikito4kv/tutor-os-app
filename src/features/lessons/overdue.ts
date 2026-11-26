import type { LessonStatus } from "@/lib/supabase/database.types";

/**
 * A lesson is "overdue" when it's still scheduled but its start time has already
 * passed — i.e. it's awaiting completion. Single source of truth for the
 * schedule views' "time to finish" marker. Time is compared as an absolute
 * instant (a lesson earlier today is overdue), handled naively in the runtime's
 * local zone like the rest of the MVP (see src/lib/date.ts).
 */
export function isLessonOverdue(
  lesson: { status: LessonStatus; starts_at: string },
  now: number = Date.now(),
): boolean {
  return lesson.status === "scheduled" && new Date(lesson.starts_at).getTime() < now;
}
