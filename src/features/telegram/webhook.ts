import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTelegramMessage } from "@/lib/telegram/send";
import { notifyTutorByTelegram } from "@/lib/telegram/notify";
import { studentConnectedMessage } from "@/lib/telegram/messages";
import { t } from "@/lib/i18n";
import { parseCommand } from "./link-code";

type Admin = SupabaseClient<Database>;

/** Minimal shape of the Telegram update fields we use (private-chat text only). */
interface TelegramUpdate {
  message?: { chat?: { id?: number; type?: string }; text?: string };
}

/**
 * Process one inbound Telegram update. Handles only what the linking flow needs:
 * `/start <payload>` (link a tutor or a student) and `/stop` (unsubscribe). Runs
 * through the service-role client (no session in a webhook). Best-effort and
 * silent on anything it doesn't recognise. Never throws — the route always 200s
 * so Telegram doesn't retry-storm us.
 */
export async function handleTelegramUpdate(update: unknown): Promise<void> {
  const message = (update as TelegramUpdate).message;
  const chat = message?.chat;
  // Only private chats: a group/channel id can exceed JS's safe-integer range
  // and we only ever DM individual tutors/students. Ignore anything else.
  if (typeof chat?.id !== "number" || chat.type !== "private") return;
  const chatId = chat.id;

  const admin = createAdminClient();
  const command = parseCommand(message?.text);

  if (command.kind === "stop") {
    await unlinkChat(admin, chatId);
    await reply(chatId, t.telegram.bot.stopped);
    return;
  }
  if (command.kind !== "start" || !command.target) {
    await reply(chatId, t.telegram.bot.unknown);
    return;
  }
  if (command.target.kind === "tutor") {
    await linkTutor(admin, chatId, command.target.code);
  } else {
    await linkStudent(admin, chatId, command.target.token);
  }
}

async function reply(chatId: number, text: string): Promise<void> {
  await sendTelegramMessage({ chatId, text });
}

/** Detach this chat from whatever it was linked to (tutor and/or student). */
async function unlinkChat(admin: Admin, chatId: number): Promise<void> {
  await admin
    .from("tutor")
    .update({ telegram_chat_id: null, telegram_linked_at: null })
    .eq("telegram_chat_id", chatId);
  await admin
    .from("student")
    .update({ telegram_chat_id: null, telegram_linked_at: null })
    .eq("telegram_chat_id", chatId);
}

async function linkTutor(admin: Admin, chatId: number, code: string): Promise<void> {
  const nowIso = new Date().toISOString();
  const { data: tutor } = await admin
    .from("tutor")
    .select("id")
    .eq("telegram_link_code", code)
    .gt("telegram_link_code_expires_at", nowIso)
    .maybeSingle();

  if (!tutor) {
    await reply(chatId, t.telegram.bot.linkInvalid);
    return;
  }

  await admin
    .from("tutor")
    .update({
      telegram_chat_id: chatId,
      telegram_linked_at: nowIso,
      telegram_link_code: null,
      telegram_link_code_expires_at: null,
    })
    .eq("id", tutor.id);
  await reply(chatId, t.telegram.bot.connectedTutor);
}

async function linkStudent(admin: Admin, chatId: number, token: string): Promise<void> {
  const { data: student } = await admin
    .from("student")
    .select("id, name, tutor_id, telegram_chat_id")
    .eq("share_token", token)
    .maybeSingle();

  if (!student) {
    await reply(chatId, t.telegram.bot.linkInvalid);
    return;
  }

  // Whether this is a genuinely new link (vs the student re-pressing Start) —
  // decides if we should re-notify the tutor.
  const isNewLink = student.telegram_chat_id !== chatId;

  await admin
    .from("student")
    .update({ telegram_chat_id: chatId, telegram_linked_at: new Date().toISOString() })
    .eq("id", student.id);
  await reply(chatId, t.telegram.bot.connectedStudent(student.name));

  // Let the tutor know their student is now reachable — only on a new link, so a
  // re-press doesn't spam them.
  if (isNewLink) {
    await notifyTutorByTelegram({
      tutorId: student.tutor_id,
      event: "student_connected",
      logLabel: "student connected",
      build: ({ appUrl }) =>
        studentConnectedMessage(student.name, `${appUrl}/students/${student.id}`),
    });
  }
}
