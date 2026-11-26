/**
 * Lesson colour palette — the single source of truth.
 *
 * We store a short KEY (e.g. "violet") in the DB, never a hex. Each key maps to a
 * theme-aware CSS token defined in `globals.css` (`--lesson-<key>`), so lesson
 * colours adapt to light/dark like every other token (see docs/DESIGN.md — no raw
 * hex in JSX). Human labels live in i18n (`t.lessons.colors`), referenced where the
 * swatches are rendered, so this module stays free of UI-string concerns.
 */

export const LESSON_COLOR_KEYS = [
  "violet",
  "blue",
  "green",
  "amber",
  "orange",
  "pink",
  "purple",
  "teal",
] as const;

export type LessonColor = (typeof LESSON_COLOR_KEYS)[number];

/** Pre-selected swatch — matches the first chip in the picker. */
export const DEFAULT_LESSON_COLOR: LessonColor = "violet";

/** CSS colour for a palette key, resolved through the theme token. */
export function lessonColorValue(key: LessonColor): string {
  return `hsl(var(--lesson-${key}))`;
}

/** Narrow an arbitrary stored value to a known palette key, or null. */
export function asLessonColor(value: string | null | undefined): LessonColor | null {
  return value && (LESSON_COLOR_KEYS as readonly string[]).includes(value)
    ? (value as LessonColor)
    : null;
}

/**
 * Inline style for a coloured left accent on a lesson chip/row, or `undefined`
 * when the colour is missing/unknown (caller then keeps the neutral border).
 */
export function lessonAccent(
  value: string | null | undefined,
): { borderLeftColor: string } | undefined {
  const key = asLessonColor(value);
  return key ? { borderLeftColor: lessonColorValue(key) } : undefined;
}
