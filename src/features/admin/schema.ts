import { z } from "zod";
import { EMAIL_MAX, SHORT_TEXT_MAX } from "@/lib/constants";
import { t } from "@/lib/i18n";

/** Admin-editable tutor profile fields (name + display currency). */
export const tutorProfileSchema = z.object({
  name: z.string().trim().max(SHORT_TEXT_MAX),
  currency: z.string().trim().min(1).max(8),
});

export function parseTutorProfileForm(formData: FormData) {
  return tutorProfileSchema.safeParse({
    name: formData.get("name"),
    currency: formData.get("currency"),
  });
}

/** Tutor login email (also their auth.users email). */
export const tutorEmailSchema = z.object({
  email: z.string().trim().email(t.auth.emailInvalid).max(EMAIL_MAX),
});

export function parseTutorEmailForm(formData: FormData) {
  return tutorEmailSchema.safeParse({ email: formData.get("email") });
}

/** Lifecycle of a support/feedback item, as stored in `public.feedback.status`. */
export const FEEDBACK_STATUSES = ["new", "seen", "closed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

/** Triage form payload: just the new status. */
export const feedbackStatusSchema = z.object({ status: z.enum(FEEDBACK_STATUSES) });

export function parseFeedbackStatusForm(formData: FormData) {
  return feedbackStatusSchema.safeParse({ status: formData.get("status") });
}

/** Inbox filter values from the `?status=` query (`all` plus each status). */
export const FEEDBACK_FILTERS = ["all", ...FEEDBACK_STATUSES] as const;
export type FeedbackFilter = (typeof FEEDBACK_FILTERS)[number];

/** Normalise the raw query value to a known filter; anything else → "all". */
export function parseFeedbackFilter(value: string | undefined): FeedbackFilter {
  return (FEEDBACK_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as FeedbackFilter)
    : "all";
}
