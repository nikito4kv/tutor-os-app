-- tutorOS — wave-1 extras: "no-show" lesson status + homework deadline.

-- 1) Allow a "no-show" status. The student didn't come; by product policy the
--    lesson is still charged (one lesson burnt), same as a completed one.
alter table public.lesson drop constraint if exists lesson_status_check;
alter table public.lesson add constraint lesson_status_check
  check (status in ('scheduled', 'done', 'canceled', 'no_show'));

-- 2) Optional homework deadline, shown to the tutor and on the student link.
alter table public.homework add column if not exists due_at timestamptz;

-- 3) Extend the "finish lesson" function with a target status (done | no_show).
--    Both are terminal and charged; idempotent on either (no double decrement).
--    Adding a 4th (defaulted) param is a NEW signature, so drop the old 3-arg
--    function first — otherwise both overloads linger and a no_show lesson could
--    be re-charged via the stale 3-arg version.
drop function if exists public.complete_lesson(uuid, text, text);

create or replace function public.complete_lesson(
  p_lesson_id uuid,
  p_topic     text default null,
  p_note      text default null,
  p_status    text default 'done'
)
returns jsonb
language plpgsql
as $$
declare
  v_student_id uuid;
  v_status     text;
  v_pkg_id     uuid;
  v_left       integer;
begin
  if p_status not in ('done', 'no_show') then
    raise exception 'invalid_status';
  end if;

  -- RLS hides other tutors' lessons, so "not found" also means "not yours".
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Already terminal (done or no_show) → idempotent no-op (no double decrement).
  if v_status in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', true);
  end if;

  update public.lesson
  set status = p_status,
      topic  = coalesce(p_topic, topic),
      note   = coalesce(p_note, note)
  where id = p_lesson_id;

  -- Burn one lesson from the oldest package that still has balance.
  select id into v_pkg_id
  from public.package
  where student_id = v_student_id and lessons_left > 0
  order by created_at asc
  limit 1
  for update;

  if v_pkg_id is not null then
    update public.package set lessons_left = lessons_left - 1 where id = v_pkg_id;
  end if;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', false);
end;
$$;
