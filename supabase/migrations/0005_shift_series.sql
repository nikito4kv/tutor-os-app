-- tutorOS — atomic "this & following / whole series" reschedule.
--
-- Editing a recurring lesson with scope future/all shifts the other scheduled
-- occurrences by a fixed interval (and resets their duration). Doing that as a
-- per-row loop in the action is neither atomic nor idempotent: a mid-loop
-- failure leaves the schedule half-shifted, and resubmitting re-reads the
-- already-moved rows and shifts them AGAIN (the offset is relative to the
-- current value). A single set-based UPDATE fixes both — it is all-or-nothing,
-- so a failed call shifts nothing and a resubmit applies the shift exactly once.
--
-- SECURITY INVOKER (the default) → RLS on `lesson` still scopes the rows to the
-- owning tutor; the function can only touch lessons the caller already owns.
create or replace function public.shift_series_lessons(
  p_series_id    uuid,
  p_exclude_id   uuid,
  p_from         timestamptz,        -- null = whole series; else only starts_at >= p_from
  p_delta_secs   double precision,
  p_duration_min integer
) returns void
language sql
as $$
  update public.lesson
  set starts_at    = starts_at + make_interval(secs => p_delta_secs),
      duration_min = p_duration_min
  where series_id = p_series_id
    and status = 'scheduled'
    and id <> p_exclude_id
    and (p_from is null or starts_at >= p_from);
$$;
