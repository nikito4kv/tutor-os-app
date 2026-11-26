-- tutorOS — RLS performance: denormalise tutor_id onto child tables.
--
-- Why: the child-table policies used `using (public.owns_student(student_id))`.
-- Because that predicate depends on each row's student_id, Postgres calls the
-- function PER ROW on every SELECT — a subquery per returned lesson/homework/etc.
-- Under load (and on range scans like the schedule) this dominates query time.
--
-- Fix: carry the owner's id directly on each child row. Reads/updates/deletes
-- filter on the indexed `tutor_id` (no function call); inserts/updates still
-- validate ownership via owns_student in WITH CHECK (low volume, and robust to
-- the BEFORE-trigger / WITH-CHECK ordering). A BEFORE INSERT trigger fills
-- tutor_id from student_id, so application code keeps inserting only student_id.
-- See docs/specs/perf-100-users/04_rls-tutor-id.md.

-- ---------------------------------------------------------------------------
-- 1) Column (nullable first — needed for the backfill below)
-- ---------------------------------------------------------------------------
alter table public.package       add column if not exists tutor_id uuid references public.tutor (id) on delete cascade;
alter table public.payment       add column if not exists tutor_id uuid references public.tutor (id) on delete cascade;
alter table public.lesson        add column if not exists tutor_id uuid references public.tutor (id) on delete cascade;
alter table public.homework      add column if not exists tutor_id uuid references public.tutor (id) on delete cascade;
alter table public.lesson_series add column if not exists tutor_id uuid references public.tutor (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- 2) Backfill from the parent student (must run BEFORE set not null)
-- ---------------------------------------------------------------------------
update public.package       c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.payment       c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.lesson        c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.homework      c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.lesson_series c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;

-- ---------------------------------------------------------------------------
-- 3) Enforce NOT NULL
-- ---------------------------------------------------------------------------
alter table public.package       alter column tutor_id set not null;
alter table public.payment       alter column tutor_id set not null;
alter table public.lesson        alter column tutor_id set not null;
alter table public.homework      alter column tutor_id set not null;
alter table public.lesson_series alter column tutor_id set not null;

-- ---------------------------------------------------------------------------
-- 4) Auto-populate tutor_id from student_id on insert — so app code is unchanged.
--    tutor_id is immutable per child (a student never changes tutor in MVP).
-- ---------------------------------------------------------------------------
create or replace function public.set_tutor_id_from_student()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.tutor_id is null then
    select tutor_id into new.tutor_id from public.student where id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists package_set_tutor       on public.package;
drop trigger if exists payment_set_tutor       on public.payment;
drop trigger if exists lesson_set_tutor        on public.lesson;
drop trigger if exists homework_set_tutor      on public.homework;
drop trigger if exists lesson_series_set_tutor on public.lesson_series;

create trigger package_set_tutor       before insert on public.package       for each row execute function public.set_tutor_id_from_student();
create trigger payment_set_tutor       before insert on public.payment       for each row execute function public.set_tutor_id_from_student();
create trigger lesson_set_tutor        before insert on public.lesson        for each row execute function public.set_tutor_id_from_student();
create trigger homework_set_tutor      before insert on public.homework      for each row execute function public.set_tutor_id_from_student();
create trigger lesson_series_set_tutor before insert on public.lesson_series for each row execute function public.set_tutor_id_from_student();

-- ---------------------------------------------------------------------------
-- 5) Indexes for the new hot path. Existing *_student_id_idx are kept.
--    The composite (tutor_id, starts_at) powers the schedule range query.
-- ---------------------------------------------------------------------------
create index if not exists lesson_tutor_starts_idx    on public.lesson        (tutor_id, starts_at);
create index if not exists package_tutor_id_idx       on public.package       (tutor_id);
create index if not exists payment_tutor_id_idx       on public.payment       (tutor_id);
create index if not exists homework_tutor_id_idx      on public.homework      (tutor_id);
create index if not exists lesson_series_tutor_id_idx on public.lesson_series (tutor_id);

-- ---------------------------------------------------------------------------
-- 6) owns_student: wrap auth.uid() in a subquery so it is evaluated once
--    (InitPlan), not per row. Still used by the WITH CHECK clauses below.
-- ---------------------------------------------------------------------------
create or replace function public.owns_student(p_student_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.student s
    where s.id = p_student_id and s.tutor_id = (select auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- 7) Rewrite policies. SELECT/UPDATE/DELETE filter on tutor_id (no per-row
--    function call). INSERT/UPDATE validate ownership via owns_student in
--    WITH CHECK (write path only — low volume, correct regardless of trigger
--    ordering since it checks student_id, not the trigger-filled tutor_id).
-- ---------------------------------------------------------------------------

-- package
drop policy if exists package_all on public.package;
create policy package_select on public.package for select using (tutor_id = (select auth.uid()));
create policy package_insert on public.package for insert with check (public.owns_student(student_id));
create policy package_update on public.package for update
  using (tutor_id = (select auth.uid())) with check (public.owns_student(student_id));
create policy package_delete on public.package for delete using (tutor_id = (select auth.uid()));

-- payment
drop policy if exists payment_all on public.payment;
create policy payment_select on public.payment for select using (tutor_id = (select auth.uid()));
create policy payment_insert on public.payment for insert with check (public.owns_student(student_id));
create policy payment_update on public.payment for update
  using (tutor_id = (select auth.uid())) with check (public.owns_student(student_id));
create policy payment_delete on public.payment for delete using (tutor_id = (select auth.uid()));

-- lesson
drop policy if exists lesson_all on public.lesson;
create policy lesson_select on public.lesson for select using (tutor_id = (select auth.uid()));
create policy lesson_insert on public.lesson for insert with check (public.owns_student(student_id));
create policy lesson_update on public.lesson for update
  using (tutor_id = (select auth.uid())) with check (public.owns_student(student_id));
create policy lesson_delete on public.lesson for delete using (tutor_id = (select auth.uid()));

-- homework
drop policy if exists homework_all on public.homework;
create policy homework_select on public.homework for select using (tutor_id = (select auth.uid()));
create policy homework_insert on public.homework for insert with check (public.owns_student(student_id));
create policy homework_update on public.homework for update
  using (tutor_id = (select auth.uid())) with check (public.owns_student(student_id));
create policy homework_delete on public.homework for delete using (tutor_id = (select auth.uid()));

-- lesson_series
drop policy if exists lesson_series_all on public.lesson_series;
create policy lesson_series_select on public.lesson_series for select using (tutor_id = (select auth.uid()));
create policy lesson_series_insert on public.lesson_series for insert with check (public.owns_student(student_id));
create policy lesson_series_update on public.lesson_series for update
  using (tutor_id = (select auth.uid())) with check (public.owns_student(student_id));
create policy lesson_series_delete on public.lesson_series for delete using (tutor_id = (select auth.uid()));
