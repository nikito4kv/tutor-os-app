-- tutorOS — initial schema, RLS, and the "complete lesson" mechanic.
-- Naming follows docs/ARCHITECTURE.md (singular table names matching the data model).
-- Run via: supabase db push   (see docs/SETUP.md)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Tutor profile, 1:1 with auth.users. Auto-created by trigger on sign-up.
create table public.tutor (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  email      text not null,
  -- Per-tutor display currency (ISO-4217). No payment processing in MVP.
  currency   text not null default 'RUB',
  created_at timestamptz not null default now()
);

create table public.student (
  id             uuid primary key default gen_random_uuid(),
  tutor_id       uuid not null references public.tutor (id) on delete cascade,
  name           text not null,
  contact        text,
  parent_contact text,
  subject        text,
  level          text,
  -- Unguessable slug for the no-login student/parent page.
  share_token    text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at     timestamptz not null default now()
);
create index student_tutor_id_idx on public.student (tutor_id);

-- A bought block of lessons. A student may have several over time.
create table public.package (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references public.student (id) on delete cascade,
  total_lessons integer not null check (total_lessons > 0),
  lessons_left  integer not null check (lessons_left >= 0),
  price         numeric(12, 2),
  created_at    timestamptz not null default now()
);
create index package_student_id_idx on public.package (student_id);

-- Manual payment record (no acquiring in MVP).
create table public.payment (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id) on delete cascade,
  amount     numeric(12, 2) not null,
  paid_at    timestamptz not null default now(),
  note       text,
  created_at timestamptz not null default now()
);
create index payment_student_id_idx on public.payment (student_id);

create table public.lesson (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.student (id) on delete cascade,
  starts_at    timestamptz not null,
  duration_min integer not null default 60 check (duration_min > 0),
  status       text not null default 'scheduled'
    check (status in ('scheduled', 'done', 'canceled')),
  topic        text,
  note         text,
  -- Reserved for the deferred video-room slice (Daily.co). Unused in accounting core.
  room_name    text,
  created_at   timestamptz not null default now()
);
create index lesson_student_id_idx on public.lesson (student_id);
create index lesson_starts_at_idx on public.lesson (starts_at);

create table public.homework (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public.student (id) on delete cascade,
  lesson_id       uuid references public.lesson (id) on delete set null,
  title           text not null,
  description     text,
  attachment_url  text,
  status          text not null default 'assigned'
    check (status in ('assigned', 'submitted', 'reviewed')),
  submission_text text,
  submission_url  text,
  feedback        text,
  created_at      timestamptz not null default now()
);
create index homework_student_id_idx on public.homework (student_id);

-- ---------------------------------------------------------------------------
-- Ownership helper + new-user trigger
-- ---------------------------------------------------------------------------

-- True when the current auth user owns the given student. SECURITY DEFINER so
-- it can read public.student regardless of the caller's RLS on child queries.
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

-- Create the tutor profile row when an auth user signs up.
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- The "Finish lesson" mechanic — the heart of the walking skeleton.
-- Kept in ONE place, synchronous, atomic. No queues, no background workers.
-- SECURITY INVOKER (default): RLS applies, so a tutor can only touch own rows.
-- Idempotent: calling it twice on the same lesson decrements only once.
-- ---------------------------------------------------------------------------
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
  -- RLS hides other tutors' lessons, so "not found" also means "not yours".
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Already completed → idempotent no-op (no double decrement).
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

-- ---------------------------------------------------------------------------
-- Row Level Security — a tutor sees ONLY their own data.
-- The no-login student page does NOT use these policies; it goes through
-- trusted server code gated on share_token (service role). See ARCHITECTURE.md.
-- ---------------------------------------------------------------------------

alter table public.tutor    enable row level security;
alter table public.student  enable row level security;
alter table public.package  enable row level security;
alter table public.payment  enable row level security;
alter table public.lesson   enable row level security;
alter table public.homework enable row level security;

-- tutor: read/update own profile (insert is done by the trigger).
create policy tutor_select on public.tutor for select using (id = auth.uid());
create policy tutor_update on public.tutor for update using (id = auth.uid()) with check (id = auth.uid());

-- student: full control over own students.
create policy student_all on public.student for all
  using (tutor_id = auth.uid()) with check (tutor_id = auth.uid());

-- child tables: ownership through the parent student.
create policy package_all on public.package for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

create policy payment_all on public.payment for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

create policy lesson_all on public.lesson for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));

create policy homework_all on public.homework for all
  using (public.owns_student(student_id)) with check (public.owns_student(student_id));
