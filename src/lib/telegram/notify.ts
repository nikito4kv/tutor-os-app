import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config";
import { sendTelegramMessage } from "./send";

type Admin = SupabaseClient<Database>;

/**
 * Telegram notifier — the channel-agnostic sibling of `src/lib/email/notify.ts`.
 *
 * Always runs through the **service-role** client: it reads chat ids and writes
 * the `notification` journal, both of which are RLS-locked to trusted server code
 * (webhook + cron + these best-effort notifiers). Callers pass only ids + a body
 * builder; we resolve the recipient. Like email, these **never throw** — a failed
 * notification must not fail the action that triggered it.
 *
 * Idempotency: when a `dedupKey` is given (cron reminders), a UNIQUE row in
 * `notification` gates re-sends. We journal **only a real successful send** — not
 * mock-mode sends (no token) and not failures — so a transient error retries on
 * the next cron tick instead of being permanently swallowed, and local mock runs
 * don't burn dedup keys.
 */

/** Has a notification with this dedup key already been recorded? */
async function alreadySent(admin: Admin, dedupKey: string): Promise<boolean> {
  const { data } = await admin
    .from("notification")
    .select("id")
    .eq("dedup_key", dedupKey)
    .maybeSingle();
  return Boolean(data);
}

async function record(
  admin: Admin,
  row: Database["public"]["Tables"]["notification"]["Insert"],
): Promise<void> {
  await admin.from("notification").insert(row);
}

export async function notifyStudentByTelegram(opts: {
  studentId: string;
  event: string;
  /** Idempotency key, e.g. `lesson_24h:<id>`. Omit for fire-once event sends. */
  dedupKey?: string | null;
  /** Short label for log lines, e.g. "homework reminder". */
  logLabel: string;
  build: (ctx: { name: string; url: string }) => string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const dedupKey = opts.dedupKey ?? null;
    if (dedupKey && (await alreadySent(admin, dedupKey))) return;

    const { data: student } = await admin
      .from("student")
      .select("name, share_token, telegram_chat_id")
      .eq("id", opts.studentId)
      .maybeSingle();
    if (!student?.telegram_chat_id) return;

    const text = opts.build({
      name: student.name,
      url: `${env.appUrl}/s/${student.share_token}`,
    });
    const result = await sendTelegramMessage({ chatId: student.telegram_chat_id, text });
    if (result.ok && !result.mocked) {
      await record(admin, {
        recipient_kind: "student",
        recipient_id: opts.studentId,
        event: opts.event,
        dedup_key: dedupKey,
        status: "sent",
        error: null,
      });
    } else if (!result.ok) {
      console.error(`[telegram] ${opts.logLabel} failed: ${result.error}`);
    }
  } catch (e) {
    console.error(
      `[telegram] ${opts.logLabel} error: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }
}

export async function notifyTutorByTelegram(opts: {
  tutorId: string;
  event: string;
  dedupKey?: string | null;
  logLabel: string;
  build: (ctx: { appUrl: string }) => string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const dedupKey = opts.dedupKey ?? null;
    if (dedupKey && (await alreadySent(admin, dedupKey))) return;

    const { data: tutor } = await admin
      .from("tutor")
      .select("telegram_chat_id")
      .eq("id", opts.tutorId)
      .maybeSingle();
    if (!tutor?.telegram_chat_id) return;

    const text = opts.build({ appUrl: env.appUrl });
    const result = await sendTelegramMessage({ chatId: tutor.telegram_chat_id, text });
    if (result.ok && !result.mocked) {
      await record(admin, {
        recipient_kind: "tutor",
        recipient_id: opts.tutorId,
        event: opts.event,
        dedup_key: dedupKey,
        status: "sent",
        error: null,
      });
    } else if (!result.ok) {
      console.error(`[telegram] ${opts.logLabel} failed: ${result.error}`);
    }
  } catch (e) {
    console.error(
      `[telegram] ${opts.logLabel} error: ${e instanceof Error ? e.message : "unknown"}`,
    );
  }
}
