import { listLessonsInRange } from "@/features/lessons/queries";
import { addDays } from "@/lib/date";
import { TodayLessons } from "../today-lessons";
import { getStudentNameMap, withStudent } from "../shared";

export async function TodayLessonsLoader() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  const [lessons, names] = await Promise.all([
    listLessonsInRange(dayStart.toISOString(), dayEnd.toISOString()),
    getStudentNameMap(),
  ]);
  return <TodayLessons lessons={lessons.map((l) => withStudent(l, names))} />;
}
