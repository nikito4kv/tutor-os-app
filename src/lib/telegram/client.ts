import "server-only";
import { env } from "@/lib/config";

/**
 * Base URL of the Telegram Bot API for our bot, or `null` when no token is
 * configured (local dev / MVP) — callers then fall back to mock mode instead of
 * throwing, exactly like the email client without RESEND_API_KEY.
 */
export function getBotApiBase(): string | null {
  const token = env.telegramBotToken;
  return token ? `https://api.telegram.org/bot${token}` : null;
}
