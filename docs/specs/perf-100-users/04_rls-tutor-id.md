# Псевдокод — P4: денормализация `tutor_id` + RLS без функции на строку

Файл: `supabase/migrations/0009_rls_tutor_id.sql` (новый). Требования: §5 спеки
(`00_specification.md`). Сложность: средняя, **миграция** — применяется на удалённый Supabase
последней (repair истории перед push).

## Текущее (функция на каждую строку)

```sql
-- 0001_init.sql
create policy lesson_all on public.lesson for all
  using (public.owns_student(student_id))           -- owns_student = SELECT exists(...)
  with check (public.owns_student(student_id));      -- вызывается НА КАЖДУЮ строку
-- то же для package / payment / homework и lesson_series (0003)

-- owns_student дёргает auth.uid() (тоже на строку):
create function owns_student(p_student_id uuid) ... as $$
  select exists(select 1 from student s where s.id = p_student_id and s.tutor_id = auth.uid());
$$;
```

Выборка N строк → N вызовов функции + N раз `auth.uid()`. `/schedule`
(`listLessonsInRange`, диапазон по `starts_at`) особенно страдает.

## Целевое (`0009_rls_tutor_id.sql`)

Дочерние таблицы получают денормализованный `tutor_id`; горячий путь SELECT — простой
индексируемый фильтр без функции. Запись остаётся под `owns_student` (низкий объём,
не зависит от порядка триггеров).

```sql
-- 1) Колонка tutor_id (nullable на старте — для бэкфилла)
alter table public.package       add column if not exists tutor_id uuid references public.tutor(id) on delete cascade;
alter table public.payment       add column if not exists tutor_id uuid references public.tutor(id) on delete cascade;
alter table public.lesson        add column if not exists tutor_id uuid references public.tutor(id) on delete cascade;
alter table public.homework      add column if not exists tutor_id uuid references public.tutor(id) on delete cascade;
alter table public.lesson_series add column if not exists tutor_id uuid references public.tutor(id) on delete cascade;

-- 2) Бэкфилл из родительского student (ДО set not null — EC-P4-2)
update public.package       c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.payment       c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.lesson        c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.homework      c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;
update public.lesson_series c set tutor_id = s.tutor_id from public.student s where s.id = c.student_id and c.tutor_id is null;

-- 3) NOT NULL
alter table public.package       alter column tutor_id set not null;
alter table public.payment       alter column tutor_id set not null;
alter table public.lesson        alter column tutor_id set not null;
alter table public.homework      alter column tutor_id set not null;
alter table public.lesson_series alter column tutor_id set not null;

-- 4) Триггер автозаполнения → код приложения НЕ меняется (FR-P4-3)
create or replace function public.set_tutor_id_from_student()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.tutor_id is null then
    select tutor_id into new.tutor_id from public.student where id = new.student_id;
  end if;
  return new;
end;
$$;

create trigger package_set_tutor       before insert on public.package       for each row execute function public.set_tutor_id_from_student();
create trigger payment_set_tutor       before insert on public.payment       for each row execute function public.set_tutor_id_from_student();
create trigger lesson_set_tutor        before insert on public.lesson        for each row execute function public.set_tutor_id_from_student();
create trigger homework_set_tutor      before insert on public.homework      for each row execute function public.set_tutor_id_from_student();
create trigger lesson_series_set_tutor before insert on public.lesson_series for each row execute function public.set_tutor_id_from_student();

-- 5) Индексы (горячий путь). Старые *_student_id_idx оставляем.
create index if not exists lesson_tutor_starts_idx   on public.lesson        (tutor_id, starts_at);  -- /schedule
create index if not exists package_tutor_id_idx      on public.package       (tutor_id);
create index if not exists payment_tutor_id_idx      on public.payment       (tutor_id);
create index if not exists homework_tutor_id_idx     on public.homework      (tutor_id);
create index if not exists lesson_series_tutor_id_idx on public.lesson_series (tutor_id);

-- 6) auth.uid() в подзапрос (InitPlan, одно вычисление на запрос — FR-P4-5)
create or replace function public.owns_student(p_student_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.student s
    where s.id = p_student_id and s.tutor_id = (select auth.uid())   -- было auth.uid()
  );
$$;

-- 7) Переписать политики: SELECT/UPDATE/DELETE по tutor_id (без функции),
--    INSERT/UPDATE WITH CHECK — owns_student (корректность записи, низкий объём).
--    Шаблон для package / payment / lesson / homework / lesson_series:
drop policy if exists lesson_all on public.lesson;
create policy lesson_select on public.lesson for select using (tutor_id = (select auth.uid()));
create policy lesson_insert on public.lesson for insert with check (public.owns_student(student_id));
create policy lesson_update on public.lesson for update
  using (tutor_id = (select auth.uid())) with check (public.owns_student(student_id));
create policy lesson_delete on public.lesson for delete using (tutor_id = (select auth.uid()));
-- ... повторить для package_*, payment_*, homework_*, lesson_series_* ...
```

## Заметки

- **Почему split по командам.** Горячий путь — SELECT (чтения тысячами на 100 юзеров): он
  становится `tutor_id = (select auth.uid())` — индексируемый фильтр, ноль вызовов функции
  (AC-P4-1/2). Записи редки → их `with check (owns_student(student_id))` оставляем: это
  и сохраняет прежнюю гарантию «нельзя писать чужому ученику» (INV-P4-3), и снимает вопрос
  порядка «BEFORE-триггер vs WITH CHECK» (insert проверяется по student_id, а не по ещё-не-
  заполненному tutor_id).
- **Иммутабельность `tutor_id`.** Ученик не меняет тьютора в MVP → денормализованное значение
  не протухает (INV-P4-1). Если когда-нибудь появится реассайн ученика — добавить UPDATE-каскад
  отдельной миграцией/ADR.
- **`/schedule`.** Композитный `lesson(tutor_id, starts_at)` превращает `listLessonsInRange`
  (фильтр диапазона + RLS по tutor_id) в index range scan вместо seq scan с функцией на строку
  (AC-P4-2).
- **Публичная ссылка не задета** (INV-P4-4): `getShareView` идёт через service-role (RLS
  обходится по `share_token`), политики на неё не влияют.
- **`complete_lesson`/`reopen_lesson`** делают UPDATE существующих строк — `tutor_id` уже
  заполнен бэкфиллом/триггером, отдельной правки функций не требуется (EC-P4-3).
- **`owns_student` остаётся** (используется в WITH CHECK) — не дропаем.
- **Деплой:** миграция меняет security-критичные политики. Применять на удалённый Supabase
  с repair истории миграций; проверить RLS-видимость до и
  после на тестовом тьюторе.

## TDD-анкеры

RLS/EXPLAIN юнит-тестом не покрыть — контракт БД (ручной psql / pgTAP) по сценариям AC.

```
# Контракт БД (две сессии: тьютор A и тьютор B)
TEST "tutor sees only own rows":
    GIVEN A владеет ученик1, B владеет ученик2
    WHEN  A: select * from lesson
    THEN  только уроки ученик1 (нет строк B)                       # AC-P4-3

TEST "hot SELECT path has no owns_student call":
    WHEN  explain analyze select * from lesson where starts_at between $1 and $2
    THEN  план без вызова функции owns_student, index scan по (tutor_id, starts_at)  # AC-P4-1/2

TEST "insert without tutor_id auto-fills owner":
    WHEN  A вставляет lesson только с student_id своего ученика
    THEN  строка создана, tutor_id == A                            # AC-P4-4 / EC-P4-1

TEST "cannot write to another tutor's student":
    WHEN  A вставляет/обновляет строку со student_id ученика B
    THEN  отказ RLS (with check owns_student)                      # AC-P4-5 / INV-P4-3

TEST "backfill covers all existing rows before NOT NULL":
    THEN  миграция применяется без ошибки на непустой БД           # EC-P4-2 / AC-P4-6

TEST "tutor_id always equals student's tutor_id":
    THEN  для всех дочерних строк c.tutor_id == student.tutor_id   # INV-P4-1
```
