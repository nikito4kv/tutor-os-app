# ADR-0004 — read-only admin directory

## Context

The admin role was initially limited to aggregate counters and feedback triage.
For support and onboarding checks, admins now need to inspect newly added tutors
and students with their basic data.

## Decision

Admins may read a narrow directory projection of tutors and students through
trusted server-side admin queries after the `(admin)` route has passed
`assertAdmin()`:

- tutors: id, name, email, currency, created date, student/lesson counts
- students: id, basic profile fields, tutor name/email, lesson/homework counts

We do not add broad admin RLS policies on tenant tables, and admins still do not
get lesson-management workflows. The server code must keep the projection
explicit instead of exposing raw table rows.

## Consequences

- The admin UI can show `/admin/users` with a compact tutor/student switch.
  Legacy `/admin/tutors` and `/admin/students` routes redirect into that
  unified screen.
- The exposed data is explicit and auditable in migrations.
- Future additions to admin-visible fields require changing the RPC projection,
  not opening direct table access.
