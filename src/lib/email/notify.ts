import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { env } from "@/lib/config";
import { contactHref } from "@/features/students/contact";
import { sendEmail } from "./send";
import type { EmailContent } from "./templates";

type Client = SupabaseClient<Database>;

/** Context handed to the body builder once we know the student is emailable. */
export interface StudentEmailContext {
  /** Student's display name (already known to be safe to greet with). */
  name: string;
  /** The student's public page, e.g. for an "open" link in the email. */
  url: string;
}

/** Replace any email-looking substring so provider errors can't leak PII into logs. */
function redactEmails(text: string): string {
  return text.replace(/[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+/g, "<redacted-email>");
}

/**
 * Best-effort: email a student. Fetches the student, sends only when their
 * free-text contact is an email (phone / Telegram / link are skipped silently),
 * builds the body via `build`, and **never throws** — a failed notification must
 * not fail the action that triggered it. Errors are logged with email addresses
 * redacted (the project rule is to keep PII out of logs).
 */
export async function notifyStudentByEmail(opts: {
  supabase: Client;
  studentId: string;
  /** Short label for log lines, e.g. "homework notification". */
  logLabel: string;
  build: (ctx: StudentEmailContext) => EmailContent;
}): Promise<void> {
  try {
    const { data: student } = await opts.supabase
      .from("student")
      .select("name, contact, share_token")
      .eq("id", opts.studentId)
      .maybeSingle();
    if (!student) return;

    const link = contactHref(student.contact);
    if (link?.kind !== "email") return;

    const content = opts.build({
      name: student.name,
      url: `${env.appUrl}/s/${student.share_token}`,
    });
    const result = await sendEmail({ to: link.href.replace(/^mailto:/, ""), ...content });
    if (!result.ok) {
      console.error(`[email] ${opts.logLabel} failed: ${redactEmails(result.error)}`);
    }
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown";
    console.error(`[email] ${opts.logLabel} error: ${redactEmails(detail)}`);
  }
}
