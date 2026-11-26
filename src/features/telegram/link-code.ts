/**
 * Telegram linking codes and /start command parsing. Kept **pure** and
 * **isomorphic** (Web Crypto, no node imports) like `students/share-token.ts`, so
 * it's safe to import from server actions, the webhook, and unit tests alike.
 *
 * Payload routing: a tutor's one-time code is prefixed `t_`; a student is linked
 * by their raw `share_token` (the very code from the share link, as requested).
 * This is unambiguous because `share_token` only ever contains [a-z0-9-] (see
 * `slugify`) — it can never contain an underscore.
 */
import { TELEGRAM_LINK_CODE_TTL_MIN } from "@/lib/constants";

const LINK_CODE_BYTES = 16;
const TUTOR_PREFIX = "t_";

/** Unguessable hex code for a tutor's one-time Telegram link (Web Crypto). */
export function generateTutorLinkCode(): string {
  const bytes = new Uint8Array(LINK_CODE_BYTES);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export type StartTarget = { kind: "tutor"; code: string } | { kind: "student"; token: string };

/** Parse a `/start` payload into a link target, or null if empty. */
export function parseStartPayload(payload: string | undefined | null): StartTarget | null {
  const p = (payload ?? "").trim();
  if (!p) return null;
  if (p.startsWith(TUTOR_PREFIX)) {
    const code = p.slice(TUTOR_PREFIX.length);
    return code ? { kind: "tutor", code } : null;
  }
  return { kind: "student", token: p };
}

export type BotCommand =
  | { kind: "start"; target: StartTarget | null }
  | { kind: "stop" }
  | { kind: "other" };

/** Parse a chat message into a recognised bot command (`/start [payload]`, `/stop`). */
export function parseCommand(text: string | undefined | null): BotCommand {
  const trimmed = (text ?? "").trim();
  if (!trimmed.startsWith("/")) return { kind: "other" };
  const [raw = "", ...rest] = trimmed.split(/\s+/);
  const command = raw.replace(/@.*$/, "").toLowerCase(); // strip @botname suffix used in groups
  if (command === "/start") return { kind: "start", target: parseStartPayload(rest.join(" ")) };
  if (command === "/stop") return { kind: "stop" };
  return { kind: "other" };
}

/** The `?start=` payload that links a tutor (round-trips through parseStartPayload). */
export function tutorStartPayload(code: string): string {
  return `${TUTOR_PREFIX}${code}`;
}

/** ISO expiry for a freshly-minted tutor link code. */
export function linkCodeExpiry(now: number = Date.now()): string {
  return new Date(now + TELEGRAM_LINK_CODE_TTL_MIN * 60_000).toISOString();
}

/** Build the bot deep link a user opens to connect, e.g. https://t.me/<bot>?start=<payload>. */
export function buildBotDeepLink(botUsername: string, startPayload: string): string {
  return `https://t.me/${botUsername}?start=${startPayload}`;
}
