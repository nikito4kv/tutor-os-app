import { z } from "zod";
import { SHORT_TEXT_MAX, SUPPORT_MESSAGE_MAX } from "@/lib/constants";

export const SUPPORT_CATEGORIES = ["bug", "idea", "question", "other"] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

export const supportFeedbackSchema = z.object({
  category: z.enum(SUPPORT_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(5, "Опишите обращение чуть подробнее")
    .max(SUPPORT_MESSAGE_MAX, "Сообщение слишком длинное"),
  contact: optionalText(SHORT_TEXT_MAX),
  page_url: optionalText(1000),
});

export type SupportFeedbackInput = z.infer<typeof supportFeedbackSchema>;

export function parseSupportFeedbackForm(formData: FormData) {
  return supportFeedbackSchema.safeParse({
    category: formData.get("category"),
    message: formData.get("message"),
    contact: formData.get("contact"),
    page_url: formData.get("page_url"),
  });
}
