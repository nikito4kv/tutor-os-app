-- tutorOS — recurring lessons (materialised model).
-- A series stores the RFC 5545 recurrence rule (RRULE); concrete lessons remain
-- real `lesson` rows linked back via `series_id`, so completion, balance, RLS
-- and homework links keep working unchanged. See docs/MVP.md (Фича 3).

create table if not exists public.lesson_series (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student (id) on delete cascade,
  -- RFC 5545 RRULE pattern, e.g. 'FREQ=WEEKLY;BYDAY=TU;COUNT=8'. dtstart is kept
  -- separately below. Bounded at creation (COUNT/UNTIL) — no infinite series.
  rrule        text not null,
  dtstart      timestamptz not null,
  duration_min integer not null default 60 check (duration_min > 0),
  topic        text,
  created_at   timestamptz not null default now()
);
create index if not exists lesson_series_student_id_idx on public.lesson_series (student_id);

-- Link each generated lesson to its series. `set null` keeps a completed lesson's
-- history intact if the series is later removed.
alter table public.lesson
  add column if not exists series_id uuid references public.lesson_series (id) on delete set null;
create index if not exists lesson_series_id_idx on public.lesson (series_id);

-- RLS: ownership flows through the student, like the other child tables.
alter table public.lesson_series enable row level security;
drop policy if exists lesson_series_all on public.lesson_series;
create policy lesson_series_all on public.lesson_series for all
  using (public.owns_student(student_id))
  with check (public.owns_student(student_id));
