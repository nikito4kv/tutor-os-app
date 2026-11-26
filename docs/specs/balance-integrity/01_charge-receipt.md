# Псевдокод — B1 + B2: «чек» списания и блокировка строки урока

Требования: §2, §3 спеки. Сложность: средняя. Затрагивает только БД (миграция `0010`) +
регенерацию типов. Код приложения и UI **не меняются** (сигнатуры RPC и JSON-ответы те же).

Зеркало философии ядра (миграции 0001/0004/0008): атомарно, идемпотентно, `SECURITY INVOKER`.
Идея: урок **помнит**, с какого пакета списался («чек»), поэтому reopen — точная инверсия, а не
угадывание; `FOR UPDATE` сериализует конкурентные вызовы.

---

## Модуль 1 — миграция `supabase/migrations/0010_lesson_charge_receipt.sql`

### 1.1 Столбец-«чек»

```sql
-- "Чек" списания: с какого пакета списан этот урок. NULL = списания не было
-- (завершение при нулевом балансе). on delete set null: если пакет удалён, чек гаснет
-- и reopen не пытается вернуть в несуществующий пакет.
alter table public.lesson
  add column if not exists charged_package_id uuid
  references public.package (id) on delete set null;

-- Ускоряет on-delete-set-null при удалении пакета (низкий объём, но дёшево и аккуратно).
create index if not exists lesson_charged_package_id_idx
  on public.lesson (charged_package_id);
```

### 1.2 Backfill legacy-уроков (best-effort → самый старый пакет)

```sql
-- Старое complete_lesson всегда списывало со САМОГО СТАРОГО пакета с балансом,
-- поэтому лучшая догадка для уже завершённых уроков — старейший пакет ученика.
-- Ставит только указатель; балансы не меняет. Если уроков/пакетов нет — no-op.
update public.lesson l
set charged_package_id = p.id
from lateral (
  select pk.id
  from public.package pk
  where pk.student_id = l.student_id
  order by pk.created_at asc
  limit 1
) p
where l.status in ('done', 'no_show')
  and l.charged_package_id is null;
```

### 1.3 `complete_lesson` — списание + проставление чека + `FOR UPDATE`

```sql
-- Сигнатура без изменений (4 арг.). Отличия от 0004:
--   • SELECT ... FOR UPDATE  (B2: сериализация конкурентных вызовов)
--   • UPDATE lesson ... SET charged_package_id = v_pkg_id  (B1: чек)
create or replace function public.complete_lesson(
  p_lesson_id uuid,
  p_topic     text default null,
  p_note      text default null,
  p_status    text default 'done'
)
returns jsonb
language plpgsql
as $$
declare
  v_student_id uuid;
  v_status     text;
  v_pkg_id     uuid;
  v_left       integer;
begin
  if p_status not in ('done', 'no_show') then
    raise exception 'invalid_status';
  end if;

  -- B2: блокируем строку урока — второй конкурентный вызов ждёт здесь.
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id
  for update;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Уже терминальный → идемпотентный no-op (без второго списания).
  if v_status in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', true);
  end if;

  -- Списываем 1 занятие со старейшего пакета с балансом; запоминаем какой.
  select id into v_pkg_id
  from public.package
  where student_id = v_student_id and lessons_left > 0
  order by created_at asc
  limit 1
  for update;

  if v_pkg_id is not null then
    update public.package set lessons_left = lessons_left - 1 where id = v_pkg_id;
  end if;

  -- B1: статус + чек в одной UPDATE (v_pkg_id = NULL, если списывать было нечего).
  update public.lesson
  set status = p_status,
      topic  = coalesce(p_topic, topic),
      note   = coalesce(p_note, note),
      charged_package_id = v_pkg_id
  where id = p_lesson_id;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'low_balance', v_left <= 2, 'already_done', false);
end;
$$;
```

### 1.4 `reopen_lesson` — возврат строго по чеку + `FOR UPDATE`

```sql
-- Сигнатура без изменений. Отличия от 0008:
--   • SELECT ... FOR UPDATE и читаем charged_package_id  (B2 + B1)
--   • возврат ТОЛЬКО по чеку и ровно в тот же пакет; больше НЕ ищем «свежий с местом»
create or replace function public.reopen_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_student_id uuid;
  v_status     text;
  v_pkg_id     uuid;   -- из charged_package_id (чек)
  v_left       integer;
begin
  -- B2: блокируем строку урока; заодно читаем чек.
  select student_id, status, charged_package_id
    into v_student_id, v_status, v_pkg_id
  from public.lesson
  where id = p_lesson_id
  for update;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Не терминальный → идемпотентный no-op, без возврата.
  if v_status not in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'reopened', false);
  end if;

  -- Назад в расписание; гасим чек (тему/заметку сохраняем — это черновик).
  update public.lesson
  set status = 'scheduled', charged_package_id = null
  where id = p_lesson_id;

  -- B1: возвращаем 1 занятие ТОЛЬКО если урок реально списывал (чек есть) и ровно
  -- в тот же пакет. least() — страховка от превышения total_lessons. Чека нет
  -- (завершение при 0 ИЛИ пакет удалён) → возврата нет → «урока из воздуха» не будет.
  if v_pkg_id is not null then
    update public.package
    set lessons_left = least(lessons_left + 1, total_lessons)
    where id = v_pkg_id;
  end if;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'reopened', true);
end;
$$;
```

### Заметки по миграции

- Порядок в файле: `alter add column` + индекс → backfill → `create or replace` обеих функций.
- `complete_lesson` пересоздаётся через `create or replace` с той же 4-арг. сигнатурой —
  дроп не нужен (сигнатура не меняется). Старый 3-арг. оверлоад уже сдроплен в 0004.
- `low_balance` в ответе по-прежнему `<= 2` (легаси-поле; канон порога — `LOW_BALANCE_THRESHOLD`
  в `constants.ts`, action всё равно пересчитывает). Не трогаем.

---

## Модуль 2 — типы `src/lib/supabase/database.types.ts`

После `db push`:

```
# В Tables.lesson.Row / Insert / Update добавить:
charged_package_id: string | null
```

Сигнатуры RPC `complete_lesson` / `reopen_lesson` не меняются → секцию Functions не трогаем.
`SELECT *` по `lesson` теперь вернёт новое поле — безвредно для существующих запросов.
Регенерация (предпочтительно): `pnpm dlx supabase gen types ...` (см. `SETUP.md`), иначе — ручная
правка строки `lesson`.

---

## TDD-анкеры

Логика в БД-функции; vitest без DB. Контракт — psql-сценарии (двойники критериев приёмки),
в будущем pgTAP.

```
# B1 — целостность баланса (psql, одна сессия):

TEST AC-B1-1 "урок из воздуха закрыт":
    GIVEN package(total=4,left=0); lesson L=scheduled
    WHEN  complete_lesson(L)         THEN sum(left)=0  AND L.charged_package_id IS NULL
    WHEN  reopen_lesson(L)           THEN sum(left)=0  (было: 1)  AND L.status=scheduled

TEST AC-B1-2 "точная инверсия":
    GIVEN package(8,8)
    WHEN  complete_lesson(L)         THEN sum(left)=7  AND L.charged_package_id=pkg
    WHEN  reopen_lesson(L)           THEN sum(left)=8  AND L.charged_package_id IS NULL

TEST AC-B1-3 "то же для no_show":
    GIVEN package(1,1); complete_lesson(L, p_status=>'no_show') ⇒ left=0
    WHEN  reopen_lesson(L)           THEN left=1, status=scheduled

TEST AC-B1-4 "несколько пакетов — возврат в тот же":
    GIVEN old=package(4,4) (старее), new=package(2,2)
    WHEN  complete_lesson(L)         THEN old=3/4, new=2/2, чек=old
    WHEN  reopen_lesson(L)           THEN old=4/4, new=2/2

TEST INV-B1-1 "не превышает total":
    GIVEN package(2,1); вручную L.charged_package_id=pkg, L.status=done
    WHEN  reopen_lesson(L)           THEN left=2 (least), не 3

TEST EC-B1-3 "пакет-чек удалён":
    GIVEN complete_lesson(L) (чек=pkg); DELETE pkg  (⇒ charged_package_id := null)
    WHEN  reopen_lesson(L)           THEN status=scheduled, без возврата, без ошибки

# B2 — гонка (две сессии psql, S1 и S2):

TEST AC-B2-1 "нет двойного списания":
    GIVEN package(8,8); lesson L=scheduled
    S1: BEGIN; complete_lesson(L); (держим транзакцию открытой)
    S2: complete_lesson(L)  -- блокируется на FOR UPDATE
    S1: COMMIT
    S2: разблокируется → видит status=done → no-op
    THEN sum(left)=7 (списан 1, не 2)

TEST AC-B2-2 "нет двойного возврата":
    аналогично для reopen_lesson на терминальном L ⇒ возвращён 1, не 2.
```

Сквозной (ручной, UI): завершить урок при нулевом балансе → переоткрыть → баланс остаётся 0
(раньше становился 1). Завершить при нормальном балансе → переоткрыть → баланс восстановлен 1:1.

## Чек реализации

- [ ] `0010_lesson_charge_receipt.sql` создан (столбец + индекс + backfill + 2 функции) и применён (`db push`).
- [ ] `database.types.ts`: поле `charged_package_id` в `lesson`.
- [ ] psql-контракт AC-B1-1…4, INV-B1-1, EC-B1-3, AC-B2-1/2 пройден.
- [ ] Ручной сквозной reopen-флоу подтверждён; `typecheck/lint/test/build` зелёные.
- [ ] Код приложения не изменён (sanity-check: `git diff src/` пуст для этого PR).
