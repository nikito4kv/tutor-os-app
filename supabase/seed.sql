-- Local integration tests use the service-role client through PostgREST.
-- New Supabase CLI projects no longer auto-grant Data API privileges.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
