import { z } from "zod";
import { DEFAULT_LESSON_DURATION_MIN, LESSON_NOTE_MAX, LESSON_TOPIC_MAX } from "@/lib/constants";

/** Optional trimmed text, capped at `max`; empty → null. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const lessonSchema = z.object({
  student_id: z.string().uuid("Выберите ученика"),
  // Value comes from <input type="datetime-local"> ("YYYY-MM-DDTHH:mm"). We
  // validate it as a date here; the action serialises it to ISO. MVP handles
  // time naively in the runtime's local zone (no per-tutor timezones yet).
  starts_at: z.coerce.date({ invalid_type_error: "Укажите дату и время" }),
  duration_min: z.coerce
    .number({ invalid_type_error: "Укажите длительность" })
    .int("Целое число минут")
    .positive("Минимум 1 минута")
    .default(DEFAULT_LESSON_DURATION_MIN),
  topic: optionalText(LESSON_TOPIC_MAX),
  // Server limit matches the live N/LESSON_NOTE_MAX counter in the form.
  note: optionalText(LESSON_NOTE_MAX),
});

export type LessonInput = z.infer<typeof lessonSchema>;

/** Parse a FormData payload into a validated LessonInput. */
export function parseLessonForm(formData: FormData) {
  return lessonSchema.safeParse({
    student_id: formData.get("student_id"),
    starts_at: formData.get("starts_at"),
    duration_min: formData.get("duration_min"),
    topic: formData.get("topic"),
    note: formData.get("note"),
  });
}

/** Rescheduling only changes the time slot; lesson card fields stay untouched. */
export const lessonRescheduleSchema = lessonSchema.pick({
  starts_at: true,
  duration_min: true,
});

export type LessonRescheduleInput = z.infer<typeof lessonRescheduleSchema>;

export function parseLessonRescheduleForm(formData: FormData) {
  return lessonRescheduleSchema.safeParse({
    starts_at: formData.get("starts_at"),
    duration_min: formData.get("duration_min"),
  });
}

/** Card editing only changes descriptive fields; date and duration stay untouched. */
export const lessonCardEditSchema = lessonSchema.pick({
  topic: true,
  note: true,
});

export type LessonCardEditInput = z.infer<typeof lessonCardEditSchema>;

export function parseLessonCardEditForm(formData: FormData) {
  return lessonCardEditSchema.safeParse({
    topic: formData.get("topic"),
    note: formData.get("note"),
  });
}
