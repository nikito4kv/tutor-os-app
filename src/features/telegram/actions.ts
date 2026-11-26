"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTutor } from "@/lib/auth";
import { env } from "@/lib/config";
import { t } from "@/lib/i18n";
import {
  buildBotDeepLink,
  generateTutorLinkCode,
  linkCodeExpiry,
  tutorStartPayload,
} from "./link-code";

export interface TutorLinkState {
  error?: string;
  /** Deep link the tutor opens to confirm the connection in Telegram. */
  deepLink?: string;
}

/**
 * Mint a fresh one-time link code for the signed-in tutor and return the bot
 * deep link. The bot stores the tutor's chat id when they press Start (see
 * webhook.ts). RLS scopes the update to the tutor's own row.
 */
export async function startTutorLinkAction(): Promise<TutorLinkState> {
  const username = env.telegramBotUsername;
  if (!username) return { error: t.telegram.settings.notConfigured };

  const tutor = await getCurrentTutor();
  const supabase = await createClient();
  const code = generateTutorLinkCode();
  const { error } = await supabase
    .from("tutor")
    .update({ telegram_link_code: code, telegram_link_code_expires_at: linkCodeExpiry() })
    .eq("id", tutor.id);
  if (error) return { error: error.message };

  return { deepLink: buildBotDeepLink(username, tutorStartPayload(code)) };
}

/** Disconnect the signed-in tutor's Telegram (and clear any pending link code). */
export async function disconnectTutorAction(): Promise<void> {
  const tutor = await getCurrentTutor();
  const supabase = await createClient();
  await supabase
    .from("tutor")
    .update({
      telegram_chat_id: null,
      telegram_linked_at: null,
      telegram_link_code: null,
      telegram_link_code_expires_at: null,
    })
    .eq("id", tutor.id);
  revalidatePath("/settings");
}

/** Disconnect a student's Telegram. RLS scopes the update to the owner's student. */
export async function disconnectStudentAction(studentId: string): Promise<void> {
  if (!z.string().uuid().safeParse(studentId).success) return;
  const supabase = await createClient();
  await supabase
    .from("student")
    .update({ telegram_chat_id: null, telegram_linked_at: null })
    .eq("id", studentId);
  revalidatePath(`/students/${studentId}`);
}
