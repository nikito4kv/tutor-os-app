import { z } from "zod";
import { LONG_TEXT_MAX, REVIEW_TEXT_MAX, SHORT_TEXT_MAX } from "@/lib/constants";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.string().uuid().nullable());

/** Optional deadline: a datetime-local string → ISO, or null (empty/invalid). */
export const homeworkDueAtSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  });

/** Coerce a FormData deadline entry to an ISO string (or null) via the schema. */
export function parseHomeworkDueAt(value: FormDataEntryValue | null): string | null {
  const result = homeworkDueAtSchema.safeParse(typeof value === "string" ? value : undefined);
  return result.success ? result.data : null;
}

export const homeworkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Укажите название")
    .max(SHORT_TEXT_MAX, "Слишком длинное название"),
  description: optionalText(LONG_TEXT_MAX),
  lesson_id: optionalUuid,
});

export type HomeworkInput = z.infer<typeof homeworkSchema>;

export function parseHomeworkForm(formData: FormData) {
  return homeworkSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    lesson_id: formData.get("lesson_id"),
  });
}

export const homeworkSubmissionSchema = z.object({
  submission_text: optionalText(LONG_TEXT_MAX),
});

export type HomeworkSubmissionInput = z.infer<typeof homeworkSubmissionSchema>;

export function parseHomeworkSubmissionForm(formData: FormData) {
  return homeworkSubmissionSchema.safeParse({
    submission_text: formData.get("submission_text"),
  });
}

export const homeworkReviewSchema = z.object({
  feedback: z
    .string()
    .trim()
    .min(1, "Напишите комментарий")
    .max(REVIEW_TEXT_MAX, "Комментарий слишком длинный"),
});

export type HomeworkReviewInput = z.infer<typeof homeworkReviewSchema>;

export function parseHomeworkReviewForm(formData: FormData) {
  return homeworkReviewSchema.safeParse({
    feedback: formData.get("feedback"),
  });
}
