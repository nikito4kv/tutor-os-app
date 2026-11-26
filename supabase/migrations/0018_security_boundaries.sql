-- Phase 2 security boundaries: support feedback is an authenticated tutor
-- channel. Anonymous inserts and rows without the current tutor id are denied.

drop policy if exists feedback_insert on public.feedback;

revoke insert on table public.feedback from anon;
grant insert on table public.feedback to authenticated;

create policy feedback_insert on public.feedback
  for insert
  to authenticated
  with check (tutor_id = (select auth.uid()));

notify pgrst, 'reload schema';