-- tutorOS — reverse of "finish lesson": reopen a completed / no-show lesson.
--
-- Mistakes happen: a tutor taps "Завершить" or "Не пришёл" by accident and the
-- balance is burnt with no way back except deleting the whole package. This
-- function is the exact mirror of complete_lesson — it sends the lesson back to
-- `scheduled` and refunds one lesson to a package — kept in ONE place,
-- synchronous, atomic and idempotent. SECURITY INVOKER (default): RLS applies,
-- so a tutor can only reopen their own lesson.
--
-- Idempotent: calling it on a non-terminal lesson is a no-op (no double refund),
-- mirroring complete_lesson's guard on already-terminal lessons.
create or replace function public.reopen_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_student_id uuid;
  v_status     text;
  v_pkg_id     uuid;
  v_left       integer;
begin
  -- RLS hides other tutors' lessons, so "not found" also means "not yours".
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Not terminal (already scheduled/canceled) → idempotent no-op, no refund.
  if v_status not in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'reopened', false);
  end if;

  -- Back into the schedule (topic/note kept — they're a working draft).
  update public.lesson set status = 'scheduled' where id = p_lesson_id;

  -- Refund one lesson to the NEWEST package that still has room
  -- (lessons_left < total_lessons). For the common single-package case this is
  -- the exact inverse of the burn and never exceeds total_lessons. No package
  -- with room (none exist, or all full) → don't add — mirrors a completion that
  -- charged nothing because the balance was already zero.
  select id into v_pkg_id
  from public.package
  where student_id = v_student_id and lessons_left < total_lessons
  order by created_at desc
  limit 1
  for update;

  if v_pkg_id is not null then
    update public.package set lessons_left = lessons_left + 1 where id = v_pkg_id;
  end if;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'reopened', true);
end;
$$;
