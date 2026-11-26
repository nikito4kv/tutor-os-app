-- 0012_admin_role.sql — internal staff/admin role.
-- Allowlist of admin users (developers): read the feedback inbox + a few
-- cross-tenant aggregate counts. Admins get NO row-level access to tenant data
-- (students/lessons/payments) — only counts via a gated function.

-- 1) Allowlist. RLS on, NO policies → недостижима из anon/authenticated; читается
--    только SECURITY DEFINER-функциями и service-role. Репетитор не может выдать
--    себе права (в отличие от колонки на tutor, чья update-политика без колоночной
--    защиты допустила бы self-escalation).
create table if not exists public.admin_user (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);
alter table public.admin_user enable row level security;

-- 2) Helper. Без аргумента (всегда auth.uid()) — нельзя пробить чужой uid и
--    выяснить, админ ли он. Используется в RLS-политиках, в RPC-гейте и в гейте
--    лэйаута. Зеркало public.owns_student (0001_init.sql).
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admin_user where user_id = auth.uid())
$$;

-- 3) Инбокс — чистый RLS, без service-role. feedback — репорты репетиторов,
--    не PII учеников, поэтому построчное чтение здесь уместно. INSERT-политика
--    из 0006 сохраняется (кнопка «Поддержка» работает как раньше).
drop policy if exists feedback_select_admin on public.feedback;
create policy feedback_select_admin on public.feedback
  for select to authenticated using (public.is_admin());

drop policy if exists feedback_update_admin on public.feedback;
create policy feedback_update_admin on public.feedback
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 4) Агрегаты — gated, только counts (никаких строк student/lesson). Деньги
--    добавляются позже отдельным ключом, без новой инфраструктуры.
create or replace function public.admin_stats()
returns json
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return json_build_object(
    'tutors',       (select count(*) from public.tutor),
    'students',     (select count(*) from public.student),
    'lessons',      (select count(*) from public.lesson),
    'feedback_new', (select count(*) from public.feedback where status = 'new')
  );
end
$$;

notify pgrst, 'reload schema';
