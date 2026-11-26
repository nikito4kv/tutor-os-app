/**
 * Email bodies. Kept **pure** (no Resend / no `server-only`) so they're trivially
 * unit-testable and reusable from any send path. Each builder returns a subject
 * plus matched HTML and plain-text parts. All user-supplied values (names,
 * titles, URLs) are HTML-escaped before interpolation — these strings are sent
 * as raw HTML, so escaping is the injection boundary.
 */
import { t } from "@/lib/i18n";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Escape the five characters that are unsafe in HTML text / attribute context. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape, then preserve line breaks (HTML collapses raw newlines) for multi-line text. */
export function escapeHtmlMultiline(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

/** Wrap pre-escaped body paragraphs into a minimal, mail-client-safe document. */
function wrap(paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px">${p}</p>`).join("");
  return `<!doctype html><html lang="ru"><body style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.5;color:#0f172a">${body}</body></html>`;
}

/** A primary action link, pre-escaped. */
function linkHtml(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="color:#0d9488">${escapeHtml(label)}</a>`;
}

export interface HomeworkAssignedInput {
  studentName: string;
  title: string;
  description?: string | null;
  url: string;
}

/** "Your tutor assigned you new homework" — links to the student's public page. */
export function homeworkAssignedEmail(input: HomeworkAssignedInput): EmailContent {
  const m = t.email;
  const subject = m.homework.subject(input.title);

  const textLines = [
    m.common.greeting(input.studentName),
    m.homework.intro,
    input.title,
    ...(input.description ? [input.description] : []),
    `${m.common.openCabinet}: ${input.url}`,
    m.common.signature,
  ];

  const htmlParagraphs = [
    escapeHtml(m.common.greeting(input.studentName)),
    escapeHtml(m.homework.intro),
    `<strong>${escapeHtml(input.title)}</strong>`,
    ...(input.description ? [escapeHtmlMultiline(input.description)] : []),
    linkHtml(input.url, m.common.openCabinet),
    escapeHtml(m.common.signature),
  ];

  return { subject, text: textLines.join("\n\n"), html: wrap(htmlParagraphs) };
}

export interface LessonsScheduledInput {
  studentName: string;
  /** Human-readable date/time of the earliest lesson (formatted by the caller). */
  when: string;
  /** How many lessons this scheduling action created. */
  count: number;
  url: string;
}

/** "A lesson / lessons were scheduled for you." One email per scheduling action. */
export function lessonsScheduledEmail(input: LessonsScheduledInput): EmailContent {
  const m = t.email;
  const single = input.count <= 1;
  const subject = single ? m.lesson.subjectOne : m.lesson.subjectMany;
  const intro = single ? m.lesson.introOne(input.when) : m.lesson.introMany(input.when);

  const textLines = [
    m.common.greeting(input.studentName),
    intro,
    `${m.common.openCabinet}: ${input.url}`,
    m.common.signature,
  ];

  const htmlParagraphs = [
    escapeHtml(m.common.greeting(input.studentName)),
    escapeHtml(intro),
    linkHtml(input.url, m.common.openCabinet),
    escapeHtml(m.common.signature),
  ];

  return { subject, text: textLines.join("\n\n"), html: wrap(htmlParagraphs) };
}
