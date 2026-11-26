-- tutorOS — storage for homework attachments / submissions.
-- Private bucket. Objects are keyed by "<student_id>/...".
--
-- Tutors read/write their own students' folders via RLS below.
-- The no-login student submission path uploads through a server action using
-- the service role key (token-gated), so it intentionally bypasses these
-- policies — see docs/ARCHITECTURE.md.

insert into storage.buckets (id, name, public)
values ('homework', 'homework', false)
on conflict (id) do nothing;

-- Folder name = student_id. owns_student() checks the current tutor owns it.
create policy homework_objects_tutor_all on storage.objects for all
  to authenticated
  using (
    bucket_id = 'homework'
    and public.owns_student((split_part(name, '/', 1))::uuid)
  )
  with check (
    bucket_id = 'homework'
    and public.owns_student((split_part(name, '/', 1))::uuid)
  );
