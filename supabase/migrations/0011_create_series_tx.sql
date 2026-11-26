-- tutorOS — atomic creation of recurring lesson series.
--
-- createLessonAction used to create each weekday's series in a loop: per weekday
-- an INSERT into lesson_series + an INSERT of its materialised lessons — 2·N
-- statements, none of them in one transaction. A mid-loop failure left the
-- already-created weekdays committed; the tutor saw an error and re-submitted,
-- duplicating them. See docs/specs/balance-integrity/02_atomic-series.md.
--
-- Fix: do the whole thing in ONE database function = one transaction. All series
-- and all their lessons are created, or nothing is — a retry after a failure is
-- safe. Mirrors shift_series_lessons (0005): set/loop logic lives in SQL.
--
-- SECURITY INVOKER (default) → the RLS *_insert policies (owns_student) and the
-- BEFORE INSERT trigger set_tutor_id_from_student (0009) apply exactly as for a
-- direct insert, so tutor_id is filled and ownership is enforced.
--
-- p_series is a JSON array; each element:
--   { "rrule": text, "dtstart": iso, "duration_min": int,
--     "topic": text|null, "note": text|null, "color": text|null,
--     "occurrences": [iso, ...] }
create or replace function public.create_lesson_series(
  p_student_id uuid,
  p_series     jsonb
) returns void
language plpgsql
as $$
declare
  v_item      jsonb;
  v_series_id uuid;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_series, '[]'::jsonb))
  loop
    insert into public.lesson_series (student_id, rrule, dtstart, duration_min, topic, color)
    values (
      p_student_id,
      v_item ->> 'rrule',
      (v_item ->> 'dtstart')::timestamptz,
      (v_item ->> 'duration_min')::int,
      v_item ->> 'topic',
      v_item ->> 'color'
    )
    returning id into v_series_id;

    insert into public.lesson (student_id, starts_at, duration_min, topic, note, series_id, color)
    select
      p_student_id,
      occ::timestamptz,
      (v_item ->> 'duration_min')::int,
      v_item ->> 'topic',
      v_item ->> 'note',
      v_series_id,
      v_item ->> 'color'
    from jsonb_array_elements_text(v_item -> 'occurrences') as occ;
  end loop;
end;
$$;
