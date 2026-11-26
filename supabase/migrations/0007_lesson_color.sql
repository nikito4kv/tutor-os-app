-- tutorOS — per-lesson colour.
-- Stores a short PALETTE KEY (e.g. 'violet'), NOT a hex — each key resolves to a
-- theme-aware CSS token at render time (see src/lib/lesson-colors.ts + globals.css),
-- so colours adapt to light/dark like every other token. Kept on both the concrete
-- lesson and its series, so newly materialised occurrences inherit it.
-- Nullable: existing lessons keep a neutral accent.

alter table public.lesson add column if not exists color text;
alter table public.lesson_series add column if not exists color text;
