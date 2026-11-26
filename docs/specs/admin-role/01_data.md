# 01 — Данные: миграция, RLS, типы

Фаза реализации данных. Единственный источник схемы и RLS — `supabase/migrations/`
(правила проекта). Аддитивно к существующим политикам `feedback` (insert-политика
`0006` сохраняется).

## Миграция `supabase/migrations/0012_admin_role.sql`

```sql
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
--    не PII учеников, поэтому построчное чтение здесь уместно.
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
```

### Заметки по миграции

- `set search_path = public` на обеих функциях — best-practice для `SECURITY
DEFINER` (как `handle_new_user` в `0001_init.sql`).
- `errcode = '42501'` (insufficient_privilege) → PostgREST вернёт 403; приложение
  до этого не доходит, т.к. гейтит раньше, но БД остаётся последним рубежом.
- Политики `feedback_select_admin`/`feedback_update_admin` **дополняют**
  `feedback_insert` — обычная отправка из кнопки поддержки не меняется.

## Провижининг админа (НЕ коммитим реальный UUID)

Отдельный шаг по месту (удалённый проект; по памяти — репейр истории перед push):

```sql
insert into public.admin_user (user_id, note)
select id, 'dev' from auth.users where email = '<dev-email>'
on conflict (user_id) do nothing;
```

Снять права — `delete from public.admin_user where user_id = '<uuid>'`.

## Типы БД — `src/lib/supabase/database.types.ts`

Файл написан руками «to match migrations». Дописать (когда проект залинкуют —
регенерация: `pnpm dlx supabase gen types typescript --linked > …`).

```ts
// public.Tables — добавить:
admin_user: {
  Row: { user_id: string; note: string | null; created_at: string };
  Insert: { user_id: string; note?: string | null; created_at?: string };
  Update: { note?: string | null };
  Relationships: [];
};

// public.Functions — добавить:
is_admin:    { Args: Record<string, never>; Returns: boolean };
admin_stats: { Args: Record<string, never>; Returns: Json };
```

Вызовы из приложения (типизированы через `Database`-дженерик, как `complete_lesson`):

```ts
const { data, error } = await supabase.rpc("is_admin"); // boolean
const { data, error } = await supabase.rpc("admin_stats"); // Json → cast в AdminStats
```

## Проверка (RLS/доступ) — Supabase MCP read-only или SQL

| Сценарий                                              | Ожидание                                    |
| ----------------------------------------------------- | ------------------------------------------- |
| не-админ: `select * from feedback`                    | пусто/только свои строки (нет admin-select) |
| не-админ: `select admin_stats()`                      | ошибка `forbidden` (42501)                  |
| не-админ: `select is_admin()`                         | `false`                                     |
| админ: `select is_admin()`                            | `true`                                      |
| админ: `select admin_stats()`                         | `{tutors, students, lessons, feedback_new}` |
| админ: `select * from feedback`                       | все строки                                  |
| админ: `update feedback set status='seen' where id=…` | проходит                                    |
| любой клиент: `select * from admin_user`              | отказ/пусто (RLS без политик)               |

→ Гейт доступа в приложении: [`02_auth-gate.md`](02_auth-gate.md).
