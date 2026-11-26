import { getNextLesson } from "@/features/lessons/queries";
import { NextLessonCard } from "../next-lesson-card";
import { getStudentNameMap, withStudent } from "../shared";

export async function NextLessonLoader() {
  const [lesson, names] = await Promise.all([getNextLesson(), getStudentNameMap()]);
  return <NextLessonCard lesson={lesson ? withStudent(lesson, names) : null} />;
}
