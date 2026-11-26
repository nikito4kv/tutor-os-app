-- tutorOS — chat attachments and schema-cache refresh.
-- This migration is intentionally defensive: it can be applied after 0015, or
-- manually on an environment where 0015 did not actually reach the database.

create table if not exists public.chat_message (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student (id) on delete cascade,
  sender text not null check (sender in ('tutor', 'student')),
  body text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_message
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size integer;

alter table public.chat_message
  alter column body set default '';

alter table public.chat_message
  drop constraint if exists chat_message_body_check;

alter table public.chat_message
  drop constraint if exists chat_message_body_or_attachment_check;

alter table public.chat_message
  add constraint chat_message_body_or_attachment_check
  check (
    (char_length(trim(body)) between 1 and 1000)
    or attachment_path is not null
  );

create index if not exists chat_message_student_created_idx
  on public.chat_message (student_id, created_at asc);

alter table public.chat_message enable row level security;

drop policy if exists chat_message_select on public.chat_message;
create policy chat_message_select on public.chat_message
  for select using (public.owns_student(student_id));

drop policy if exists chat_message_insert_tutor on public.chat_message;
create policy chat_message_insert_tutor on public.chat_message
  for insert with check (public.owns_student(student_id) and sender = 'tutor');

insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', false)
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 10485760
where id = 'chat-files';

drop policy if exists chat_files_tutor_all on storage.objects;
create policy chat_files_tutor_all on storage.objects for all
  to authenticated
  using (
    bucket_id = 'chat-files'
    and public.owns_student((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'chat-files'
    and public.owns_student((split_part(name, '/', 1))::uuid)
  );

notify pgrst, 'reload schema';
