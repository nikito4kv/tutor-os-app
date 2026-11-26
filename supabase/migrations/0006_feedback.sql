-- tutorOS — in-app support / feedback inbox.
-- Users can report bugs and suggestions from any page. Rows are insert-only
-- from the app; reading/triage can be done from the Supabase dashboard.

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

notify pgrst, 'reload schema';
