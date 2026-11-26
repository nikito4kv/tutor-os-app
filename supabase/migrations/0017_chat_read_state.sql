-- tutorOS - chat read state.

alter table public.chat_message
  add column if not exists read_at timestamptz;

create index if not exists chat_message_unread_tutor_idx
  on public.chat_message (student_id, created_at desc)
  where sender = 'student' and read_at is null;

create index if not exists chat_message_unread_student_idx
  on public.chat_message (student_id, created_at desc)
  where sender = 'tutor' and read_at is null;

do $$
begin
  alter publication supabase_realtime add table public.chat_message;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

notify pgrst, 'reload schema';


