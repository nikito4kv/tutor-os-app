import "server-only";
import { env } from "@/lib/config";
import { getResend } from "./client";
import type { EmailContent } from "./templates";

export interface EmailMessage extends EmailContent {
  to: string;
}

export type SendResult = { ok: true; mocked?: boolean } | { ok: false; error: string };

/** Cap the wait on Resend so a slow/hung send can't stall a user-facing action. */
const SEND_TIMEOUT_MS = 5000;

/** Domain part of an address, for safe logging (never the local part / name). */
function recipientDomain(email: string): string {
  const at = email.lastIndexOf("@");
  return at === -1 ? "unknown" : email.slice(at + 1);
}

/**
 * Send one transactional email via Resend. When RESEND_API_KEY is unset we run
 * in **mock mode**: nothing leaves the process (keeps local dev free + offline),
 * we just note the skipped send. Never logs PII — only the subject and the
 * recipient's domain, never names / phones / local-parts (see ARCHITECTURE.md).
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      `[email:mock] skipped "${message.subject}" → <${recipientDomain(message.to)}> (no RESEND_API_KEY)`,
    );
    return { ok: true, mocked: true };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { error } = await Promise.race([
      resend.emails.send({
        from: env.emailFrom,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Resend send timed out")), SEND_TIMEOUT_MS);
      }),
    ]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не удалось отправить письмо" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
