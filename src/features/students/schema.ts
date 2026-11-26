import { z } from "zod";
import { SHARE_CODE_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { slugify } from "./share-token";

const optionalText = z
  .string()
  .trim()
  .max(SHORT_TEXT_MAX)
  .optional()
  .transform((v) => (v ? v : null));

/**
 * Optional custom share code (the readable part of `/s/<code>`). Validated on the
 * raw text, then normalized to a slug ("" when blank). The random suffix is added
 * later in the action — empty here means "keep the existing / default link".
 */
const shareCode = z
  .string()
  .trim()
  .max(SHARE_CODE_MAX, "Слишком длинный код")
  .optional()
  .superRefine((v, ctx) => {
    if (!v) return;
    const slug = slugify(v);
    if (slug.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Латиница, цифры и дефис" });
    } else if (slug.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Минимум 2 символа" });
    }
  })
  .transform((v) => (v ? slugify(v) : ""));

export const studentSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя ученика").max(SHORT_TEXT_MAX),
  contact: optionalText,
  parent_contact: optionalText,
  subject: optionalText,
  level: optionalText,
  share_code: shareCode,
});

export type StudentInput = z.infer<typeof studentSchema>;

/** Parse a FormData payload into a validated StudentInput. */
export function parseStudentForm(formData: FormData) {
  return studentSchema.safeParse({
    name: formData.get("name"),
    contact: formData.get("contact"),
    parent_contact: formData.get("parent_contact"),
    subject: formData.get("subject"),
    level: formData.get("level"),
    share_code: formData.get("share_code"),
  });
}
