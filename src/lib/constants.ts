/** Shared business constants. Keep magic numbers here, not inline in components. */

/**
 * Total remaining lessons at or below which we surface "time to top up".
 * Canonical source of truth: the actions derive the low-balance flag from this.
 * The SQL `complete_lesson` returns its own `low_balance` for legacy reasons —
 * the app ignores it (see src/features/lessons/actions.ts).
 */
export const LOW_BALANCE_THRESHOLD = 2;

/** Default lesson length, in minutes, when creating a lesson. */
export const DEFAULT_LESSON_DURATION_MIN = 60;

/**
 * Preset lesson durations (minutes) offered as one-tap buttons. The duration
 * field stays editable, so any custom value can be typed in by hand.
 */
export const DURATION_PRESETS = [30, 45, 60, 90] as const;

/**
 * Preset package sizes offered as one-tap buttons. The lessons field stays
 * editable, so any custom size can be typed in by hand.
 */
export const PACKAGE_PRESETS = [1, 4, 8, 16] as const;

/** Common lesson start times offered as one-tap chips in the date/time picker. */
export const TIME_PRESETS = ["09:00", "12:00", "15:00", "17:00", "18:00", "19:00"] as const;

/** Fallback start time (HH:mm) when a date is picked but no time chosen yet. */
export const DEFAULT_LESSON_TIME = "18:00";

/** Short free-text fields: names, contacts, topics, brief notes. */
export const SHORT_TEXT_MAX = 150;

/** Practical email length cap; RFC allows up to 254 characters. */
export const EMAIL_MAX = 254;

/** Support form message limit requested for feedback reports. */
export const SUPPORT_MESSAGE_MAX = 500;

/** Longer body fields where a tutor/student may need several sentences. */
export const LONG_TEXT_MAX = 1000;

/** Tutor review/comment fields should stay concise but not cramped. */
export const REVIEW_TEXT_MAX = 500;

/** Hard cap on lessons generated from one recurrence rule (guards a bad UNTIL). */
export const MAX_RECURRENCE_OCCURRENCES = 52;

/** Default occurrence count when "ends after N lessons" is chosen. */
export const DEFAULT_RECURRENCE_COUNT = 8;

/** Max length of a lesson note — shown as a live counter in the form. */
export const LESSON_NOTE_MAX = SHORT_TEXT_MAX;

/** Max length of a lesson topic (short theme line). */
export const LESSON_TOPIC_MAX = SHORT_TEXT_MAX;

/** How many upcoming lessons the public student page shows (avoids a long series dump). */
export const SHARE_UPCOMING_LIMIT = 10;

/**
 * Random suffix length (bytes) appended to a custom share code, rendered as hex
 * (≈48 bits / 12 hex chars). Keeps the public, no-RLS student link unguessable
 * even when the tutor sets a human-readable part.
 */
export const SHARE_SUFFIX_BYTES = 6;

/** Max length of the readable part of a student's share code (before the suffix). */
export const SHARE_CODE_MAX = 40;

/** Cap on history-style lists in the student card (lessons history, homework). */
export const STUDENT_HISTORY_LIMIT = 50;

// ── Telegram notifications (срез 11) ─────────────────────────────────────────

/** Send the "lesson in a day" reminder once the lesson is within this many hours. */
export const LESSON_REMINDER_24H_HOURS = 24;

/** Send the "lesson in 2 hours" reminder once the lesson is within this many hours. */
export const LESSON_REMINDER_2H_HOURS = 2;

/** Remind about an unsubmitted homework once its deadline is within this many hours. */
export const HOMEWORK_DUE_SOON_HOURS = 24;

/** How long a tutor's one-time Telegram link code stays valid, in minutes. */
export const TELEGRAM_LINK_CODE_TTL_MIN = 15;

/** Telegram hard cap on a single message body (characters). */
export const TELEGRAM_MESSAGE_MAX = 4096;
