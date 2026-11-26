import { listOverdueLessons } from "@/features/lessons/queries";
import { listHomeworkToReview, listOverdueHomework } from "@/features/homework/queries";
import { ActionInbox } from "../action-inbox";
import type { DashboardInbox } from "../queries";
import { getStudentNameMap, toInboxItem, withStudent } from "../shared";

export async function InboxLoader() {
  const [toReview, overdueLessons, overdueHw, names] = await Promise.all([
    listHomeworkToReview(),
    listOverdueLessons(),
    listOverdueHomework(),
    getStudentNameMap(),
  ]);

  const reviewItems = toReview.map((h) => toInboxItem(h, names));
  const overdueLessonItems = overdueLessons.map((l) => withStudent(l, names));
  const overdueHomeworkItems = overdueHw.map((h) => toInboxItem(h, names));

  const inbox: DashboardInbox = {
    toReview: reviewItems,
    overdueLessons: overdueLessonItems,
    overdueHomework: overdueHomeworkItems,
    total: reviewItems.length + overdueLessonItems.length + overdueHomeworkItems.length,
  };

  return <ActionInbox inbox={inbox} />;
}
