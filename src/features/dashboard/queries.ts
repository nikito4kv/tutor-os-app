import type { HomeworkRow } from "@/features/homework/queries";
import type { LessonWithStudent } from "@/features/lessons/queries";

/**
 * Dashboard view-model types. The data itself is fetched per-card by the
 * loaders in `./loaders/*` (each streamed independently via <Suspense>);
 * shared fetching/merging helpers live in `./shared`.
 */

/** A homework row reduced to what the action inbox needs, plus the student name. */
export type HomeworkInboxItem = Pick<
  HomeworkRow,
  "id" | "student_id" | "title" | "status" | "due_at"
> & { studentName: string };

export interface DashboardInbox {
  toReview: HomeworkInboxItem[];
  overdueLessons: LessonWithStudent[];
  overdueHomework: HomeworkInboxItem[];
  total: number;
}
