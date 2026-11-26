-- tutorOS — accounting integrity: a "charge receipt" on each lesson + row locks.
--
-- Two bugs in the complete/reopen pair (see docs/specs/balance-integrity):
--
--  B1 "lesson from thin air". Neither complete_lesson nor reopen_lesson recorded
--     WHETHER a given lesson actually consumed a package credit, so each guessed
--     from the current package aggregate — asymmetrically. Burn fires when
--     lessons_left > 0; refund fires when lessons_left < total_lessons. So a
--     completion at zero balance charged nothing, yet a later reopen refunded +1,
--     minting balance from nowhere. Fix: the lesson REMEMBERS the package it was
--     charged to (charged_package_id). reopen refunds ONLY when that receipt is
--     present, and exactly to that package — an exact inverse, not a guess.
--
--  B2 "double charge under a race". The status was read with a plain SELECT (no
--     FOR UPDATE), so two concurrent calls on one lesson both saw 'scheduled' and
--     both burned a credit. Fix: lock the lesson row up front; the second caller
--     waits, re-reads the terminal status and hits the idempotent no-op.
--
-- Both functions keep their signatures and JSON shapes — application code is
-- unchanged. SECURITY INVOKER (default): RLS still scopes everything to the owner.

-- ---------------------------------------------------------------------------
-- 1) The "receipt": which package this lesson was charged to (NULL = none).
--    on delete set null: if the package is later removed, the receipt clears and
--    reopen won't try to refund a package that no longer exists.
-- ---------------------------------------------------------------------------
alter table public.lesson
  add column if not exists charged_package_id uuid
  references public.package (id) on delete set null;

-- Speeds the on-delete-set-null lookup when a package is deleted (low volume, cheap).
create index if not exists lesson_charged_package_id_idx
  on public.lesson (charged_package_id);

-- ---------------------------------------------------------------------------
-- 2) Backfill existing terminal lessons (best-effort). The old complete_lesson
--    always burned the OLDEST package with balance, so the oldest package is the
--    best guess for already-charged lessons. Sets only the pointer — balances are
--    untouched. No lessons/packages yet → no-op.
-- ---------------------------------------------------------------------------
-- Correlated scalar subquery in SET (NOT an UPDATE…FROM LATERAL: Postgres forbids
-- a LATERAL item from referencing the UPDATE target table — error 42P10).
update public.lesson l
set charged_package_id = (
  select pk.id
  from public.package pk
  where pk.student_id = l.student_id
  order by pk.created_at asc
  limit 1
)
where l.status in ('done', 'no_show')
  and l.charged_package_id is null;

-- ---------------------------------------------------------------------------
-- 3) complete_lesson — burn + write the receipt, with the lesson row locked.
--    Same 4-arg signature as 0004 (create or replace, no drop needed).
-- ---------------------------------------------------------------------------
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

  -- B2: lock the lesson row — a concurrent completion waits here.
  -- RLS hides other tutors' lessons, so "not found" also means "not yours".
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id
  for update;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Already terminal → idempotent no-op (no second decrement).
  if v_status in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', true);
  end if;

  -- Burn one lesson from the oldest package that still has balance; remember it.
  select id into v_pkg_id
  from public.package
  where student_id = v_student_id and lessons_left > 0
  order by created_at asc
  limit 1
  for update;

  if v_pkg_id is not null then
    update public.package set lessons_left = lessons_left - 1 where id = v_pkg_id;
  end if;

  -- B1: status + receipt in one UPDATE (v_pkg_id is NULL if nothing was burnt).
  update public.lesson
  set status = p_status,
      topic  = coalesce(p_topic, topic),
      note   = coalesce(p_note, note),
      charged_package_id = v_pkg_id
  where id = p_lesson_id;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', false);
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) reopen_lesson — refund strictly by the receipt, with the lesson row locked.
--    No more "newest package with room" guessing.
-- ---------------------------------------------------------------------------
create or replace function public.reopen_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_student_id uuid;
  v_status     text;
  v_pkg_id     uuid;   -- from charged_package_id (the receipt)
  v_left       integer;
begin
  -- B2: lock the lesson row; read the receipt in the same SELECT.
  select student_id, status, charged_package_id
    into v_student_id, v_status, v_pkg_id
  from public.lesson
  where id = p_lesson_id
  for update;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Not terminal → idempotent no-op, no refund.
  if v_status not in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'reopened', false);
  end if;

  -- Back into the schedule; clear the receipt (topic/note kept — a working draft).
  update public.lesson
  set status = 'scheduled', charged_package_id = null
  where id = p_lesson_id;

  -- B1: refund ONE lesson ONLY if this lesson actually charged a package (receipt
  -- present), and exactly to that package. least() guards against exceeding
  -- total_lessons. No receipt (completed at zero balance OR package deleted) →
  -- no refund → no "lesson from thin air".
  if v_pkg_id is not null then
    update public.package
    set lessons_left = least(lessons_left + 1, total_lessons)
    where id = v_pkg_id;
  end if;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'reopened', true);
end;
$$;
