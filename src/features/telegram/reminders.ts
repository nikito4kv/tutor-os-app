import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyStudentByTelegram } from "@/lib/telegram/notify";
import {
  homeworkDueSoonMessage,
  lessonReminder24hMessage,
  lessonReminder2hMessage,
} from "@/lib/telegram/messages";
import { formatWhenLabel } from "@/lib/date";
import {
  HOMEWORK_DUE_SOON_HOURS,
  LESSON_REMINDER_24H_HOURS,
  LESSON_REMINDER_2H_HOURS,
} from "@/lib/constants";
import { dueForReminder } from "./reminders-window";

export interface ReminderRun {
  lesson24h: number;
  lesson2h: number;
  homeworkDue: number;
}

/**
 * Scan upcoming lessons and pending homework, and fire any reminders now due.
 * Idempotent: each send carries a dedup key, so re-running this (the external
 * cron pings every ~15 min) never double-sends. Counts are candidates matched in
 * this run — actual delivery is best-effort and deduped inside the notifier.
 */
export async function runScheduledNotifications(now: number = Date.now()): Promise<ReminderRun> {
  const admin = createAdminClient();
  const nowIso = new Date(now).toISOString();
  const run: ReminderRun = { lesson24h: 0, lesson2h: 0, homeworkDue: 0 };

  // Upcoming scheduled lessons within the 24h horizon → the 2h or 24h reminder.
  const lessonHorizon = new Date(now + LESSON_REMINDER_24H_HOURS * 3_600_000).toISOString();
  const { data: lessons } = await admin
    .from("lesson")
    .select("id, student_id, starts_at")
    .eq("status", "scheduled")
    .gt("starts_at", nowIso)
    .lte("starts_at", lessonHorizon);

  for (const lesson of lessons ?? []) {
    if (dueForReminder(lesson.starts_at, now, LESSON_REMINDER_2H_HOURS, 0)) {
      run.lesson2h++;
      await notifyStudentByTelegram({
        studentId: lesson.student_id,
        event: "lesson_2h",
        dedupKey: `lesson_2h:${lesson.id}`,
        logLabel: "lesson 2h reminder",
        build: ({ url }) => lessonReminder2hMessage(formatWhenLabel(lesson.starts_at), url),
      });
    } else if (
      dueForReminder(lesson.starts_at, now, LESSON_REMINDER_24H_HOURS, LESSON_REMINDER_2H_HOURS)
    ) {
      run.lesson24h++;
      await notifyStudentByTelegram({
        studentId: lesson.student_id,
        event: "lesson_24h",
        dedupKey: `lesson_24h:${lesson.id}`,
        logLabel: "lesson 24h reminder",
        build: ({ url }) => lessonReminder24hMessage(formatWhenLabel(lesson.starts_at), url),
      });
    }
  }

  // Assigned homework whose deadline is approaching and still unsubmitted.
  const hwHorizon = new Date(now + HOMEWORK_DUE_SOON_HOURS * 3_600_000).toISOString();
  const { data: homeworks } = await admin
    .from("homework")
    .select("id, student_id, title, due_at")
    .eq("status", "assigned")
    .not("due_at", "is", null)
    .gt("due_at", nowIso)
    .lte("due_at", hwHorizon);

  for (const hw of homeworks ?? []) {
    const dueAt = hw.due_at;
    if (dueAt && dueForReminder(dueAt, now, HOMEWORK_DUE_SOON_HOURS, 0)) {
      run.homeworkDue++;
      await notifyStudentByTelegram({
        studentId: hw.student_id,
        event: "homework_due",
        dedupKey: `homework_due:${hw.id}`,
        logLabel: "homework due reminder",
        build: ({ url }) => homeworkDueSoonMessage(hw.title, formatWhenLabel(dueAt), url),
      });
    }
  }

  return run;
}
