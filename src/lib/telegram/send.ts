import "server-only";
import { TELEGRAM_MESSAGE_MAX } from "@/lib/constants";
import { getBotApiBase } from "./client";

export type SendResult = { ok: true; mocked?: boolean } | { ok: false; error: string };

/** Cap the wait on the Bot API so a slow/hung send can't stall a user-facing action. */
const SEND_TIMEOUT_MS = 5000;

/** Trim to Telegram's hard per-message limit (defensive; our bodies are short). */
function clamp(text: string): string {
  return text.length > TELEGRAM_MESSAGE_MAX ? text.slice(0, TELEGRAM_MESSAGE_MAX - 1) + "…" : text;
}

/**
 * Send one plain-text message via the Telegram Bot API. When TELEGRAM_BOT_TOKEN
 * is unset we run in **mock mode**: nothing leaves the process (keeps local dev
 * free + offline), we just note the skipped send. Never logs PII — only the chat
 * id is a Telegram-internal number, never names / contacts.
 */
export async function sendTelegramMessage(opts: {
  chatId: number;
  text: string;
}): Promise<SendResult> {
  const base = getBotApiBase();
  if (!base) {
    console.warn(`[telegram:mock] skipped message → chat ${opts.chatId} (no TELEGRAM_BOT_TOKEN)`);
    return { ok: true, mocked: true };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const controller = new AbortController();
  try {
    timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    const res = await fetch(`${base}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: opts.chatId,
        text: clamp(opts.text),
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // Telegram returns a JSON body with a description on errors (e.g. bot blocked).
      const detail = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status} ${detail}`.trim() };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не удалось отправить сообщение" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
