"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/lib/i18n";
import { parseSupportFeedbackForm } from "./schema";

export interface SupportFeedbackState {
  ok?: boolean;
  error?: string;
}

export async function submitSupportFeedbackAction(
  _prev: SupportFeedbackState,
  formData: FormData,
): Promise<SupportFeedbackState> {
  const parsed = parseSupportFeedbackForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  const requestHeaders = await headers();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: t.support.sessionExpired };
  }

  const { error } = await supabase.from("feedback").insert({
    tutor_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    contact: parsed.data.contact,
    page_url: parsed.data.page_url ?? requestHeaders.get("referer"),
    user_agent: requestHeaders.get("user-agent"),
  });

  if (error) {
    if (error.message.includes("schema cache") || error.message.includes("public.feedback")) {
      return { error: t.support.feedbackUnavailable };
    }

    return { error: error.message };
  }

  return { ok: true };
}
