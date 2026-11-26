import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/config";
import { matchesSecret } from "@/lib/security/secrets";
import { handleTelegramUpdate } from "@/features/telegram/webhook";

/**
 * Telegram webhook. Telegram POSTs every update here. We authenticate the call
 * by the secret token echoed in the X-Telegram-Bot-Api-Secret-Token header (set
 * when registering the webhook). Fail-CLOSED: if no secret is configured we do
 * NOT process the update (an unauthenticated webhook would let anyone forge
 * /start and hijack a chat). We still answer 200 so Telegram doesn't retry-storm;
 * genuine processing is best-effort.
 */
export async function POST(request: NextRequest) {
  const secret = env.telegramWebhookSecret;
  if (!secret) {
    console.error("[telegram] webhook secret not configured — refusing to process update");
    return NextResponse.json({ ok: true });
  }
  if (!matchesSecret(request.headers.get("x-telegram-bot-api-secret-token"), secret)) {
    return new NextResponse("forbidden", { status: 401 });
  }

  try {
    const update = await request.json();
    await handleTelegramUpdate(update);
  } catch (e) {
    console.error(`[telegram] webhook error: ${e instanceof Error ? e.message : "unknown"}`);
  }
  return NextResponse.json({ ok: true });
}
