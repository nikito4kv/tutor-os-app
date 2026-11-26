/**
 * Telegram message bodies. Kept **pure** (no `server-only`, no I/O) so they're
 * trivially unit-testable and reusable from any send path. Messages are sent as
 * plain text (no parse_mode), so there's no escaping boundary to worry about —
 * URLs are auto-linked by Telegram clients.
 */
import { t } from "@/lib/i18n";

const m = t.telegram.messages;

/** Append an "open cabinet" link line when a URL is provided. */
function withLink(body: string, url?: string | null): string {
  return url ? `${body}\n\n${m.open(url)}` : body;
}

// ── Student messages ─────────────────────────────────────────────────────────

export function lessonReminder24hMessage(when: string, url: string): string {
  return withLink(m.lessonReminder24h(when), url);
}

export function lessonReminder2hMessage(when: string, url: string): string {
  return withLink(m.lessonReminder2h(when), url);
}

export function homeworkAssignedMessage(title: string, url: string): string {
  return withLink(m.homeworkAssigned(title), url);
}

export function homeworkDueSoonMessage(title: string, when: string, url: string): string {
  return withLink(m.homeworkDueSoon(title, when), url);
}

export function homeworkReviewedMessage(title: string, url: string): string {
  return withLink(m.homeworkReviewed(title), url);
}

/** Single-occurrence cancel/reschedule, or a bulk summary when `count` > 1. */
export function lessonChangedMessage(
  input:
    | { kind: "canceled"; when: string; url: string }
    | { kind: "rescheduled"; when: string; url: string }
    | { kind: "canceledMany"; count: number; url: string }
    | { kind: "rescheduledMany"; count: number; url: string },
): string {
  switch (input.kind) {
    case "canceled":
      return withLink(m.lessonCanceled(input.when), input.url);
    case "rescheduled":
      return withLink(m.lessonRescheduled(input.when), input.url);
    case "canceledMany":
      return withLink(m.lessonsCanceled(input.count), input.url);
    case "rescheduledMany":
      return withLink(m.lessonsRescheduled(input.count), input.url);
  }
}

// ── Tutor messages ───────────────────────────────────────────────────────────

export function lowBalanceMessage(studentName: string, left: number, url: string): string {
  return withLink(m.lowBalance(studentName, left), url);
}

export function homeworkSubmittedMessage(studentName: string, title: string, url: string): string {
  return withLink(m.homeworkSubmitted(studentName, title), url);
}

export function studentConnectedMessage(studentName: string, url: string): string {
  return withLink(m.studentConnected(studentName), url);
}
