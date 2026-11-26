-- tutorOS — ДОЗАЛИВКА (идемпотентно, можно запускать много раз).
-- Используй, если таблицы уже созданы, а функции/RLS — нет.
-- Supabase → SQL Editor → New query → вставь всё → Run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Functions
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
    where s.id = p_student_id and s.tutor_id = auth.uid()
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.tutor (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.complete_lesson(
  p_lesson_id uuid,
  p_topic     text default null,
  p_note      text default null
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
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  if v_status = 'done' then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', true);
  end if;

  update public.lesson
  set status = 'done',
      topic  = coalesce(p_topic, topic),
      note   = coalesce(p_note, note)
  where id = p_lesson_id;

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

-- ---------------------------------------------------------------------------
-- Enable RLS (safe if already enabled)
-- ---------------------------------------------------------------------------
alter table public.tutor    enable row level security;
alter table public.student  enable row level security;
alter table public.package  enable row level security;
alter table public.payment  enable row level security;
alter table public.lesson   enable row level security;
alter table public.homework enable row level security;

-- ---------------------------------------------------------------------------
-- Policies (drop-if-exists so the script is re-runnable)
-- ---------------------------------------------------------------------------
drop policy if exists tutor_select on public.tutor;
create policy tutor_select on public.tutor for select using (id = auth.uid());

drop policy if exists tutor_update on public.tutor;
create policy tutor_update on public.tutor for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists student_all on public.student;
create policy student_all on public.student for all
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

drop policy if exists package_all on public.package;
create policy package_all on public.package for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

drop policy if exists payment_all on public.payment;
create policy payment_all on public.payment for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

drop policy if exists lesson_all on public.lesson;
create policy lesson_all on public.lesson for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

drop policy if exists homework_all on public.homework;
create policy homework_all on public.homework for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

-- ---------------------------------------------------------------------------
-- Backfill tutor profiles for anyone who signed up before the trigger existed
-- ---------------------------------------------------------------------------
insert into public.tutor (id, email, name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'name', '')
from auth.users u
on conflict (id) do nothing;

-- Refresh the Data API (PostgREST) schema cache so new functions are visible.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Feedback inbox for the global Support widget
-- ---------------------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  tutor_id   uuid references public.tutor (id) on delete set null,
  category   text not null default 'bug'
    check (category in ('bug', 'idea', 'question', 'other')),
  message    text not null check (char_length(message) between 5 and 4000),
  contact    text check (contact is null or char_length(contact) <= 200),
  page_url   text check (page_url is null or char_length(page_url) <= 1000),
  user_agent text,
  status     text not null default 'new'
    check (status in ('new', 'seen', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists feedback_tutor_id_idx on public.feedback (tutor_id);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists feedback_insert on public.feedback;
create policy feedback_insert on public.feedback for insert
  to anon, authenticated
  with check (tutor_id is null or tutor_id = auth.uid());

-- Refresh the Data API (PostgREST) schema cache so the new table is visible to Supabase JS.
notify pgrst, 'reload schema';
