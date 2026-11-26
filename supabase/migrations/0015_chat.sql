-- Tutor/student 1:1 chat. The tutor uses normal RLS; the no-login student page
-- writes through trusted server code scoped by share_token, like homework submit.

create table public.chat_message (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id) on delete cascade,
  sender     text not null check (sender in ('tutor', 'student')),
  body       text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index chat_message_student_created_idx
  on public.chat_message (student_id, created_at asc);

alter table public.chat_message enable row level security;

create policy chat_message_select on public.chat_message
  for select using (public.owns_student(student_id));

create policy chat_message_insert_tutor on public.chat_message
  for insert with check (public.owns_student(student_id) and sender = 'tutor');
