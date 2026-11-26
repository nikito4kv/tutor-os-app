# Псевдокод — B3: атомарное создание серии (одна транзакция)

Требования: §4 спеки. Сложность: средняя. Затрагивает БД (миграция `0011`), `createLessonAction`,
типы, + чистый хелпер сборки JSON под юнит-тест.

Идея: вынести «N серий + их уроки» из цикла не-атомарных вставок в **одну** БД-функцию = одна
транзакция (всё или ничего). Зеркало `shift_series_lessons` (0005): set-/loop-логика в SQL,
`SECURITY INVOKER` → RLS и триггер `set_tutor_id_from_student` работают как обычно.

---

## Модуль 1 — миграция `supabase/migrations/0011_create_series_tx.sql`

```sql
-- create_lesson_series: атомарно создаёт все серии и их материализованные уроки.
-- p_series = JSON-массив; на каждый элемент — одна lesson_series + bulk-insert уроков.
-- Вся функция выполняется одной транзакцией: частичный сбой откатывает ВСЁ.
-- SECURITY INVOKER (default) → RLS *_insert (owns_student) и триггеры tutor_id применяются.
--
-- Формат элемента p_series:
--   { "rrule": text, "dtstart": iso, "duration_min": int,
--     "topic": text|null, "note": text|null, "color": text|null,
--     "occurrences": [iso, ...] }
create or replace function public.create_lesson_series(
  p_student_id uuid,
  p_series     jsonb
) returns void
language plpgsql
as $$
declare
  v_item      jsonb;
  v_series_id uuid;
begin
  for v_item in select * from jsonb_array_elements(coalesce(p_series, '[]'::jsonb))
  loop
    insert into public.lesson_series (student_id, rrule, dtstart, duration_min, topic, color)
    values (
      p_student_id,
      v_item ->> 'rrule',
      (v_item ->> 'dtstart')::timestamptz,
      (v_item ->> 'duration_min')::int,
      v_item ->> 'topic',
      v_item ->> 'color'
    )
    returning id into v_series_id;

    insert into public.lesson (student_id, starts_at, duration_min, topic, note, series_id, color)
    select
      p_student_id,
      occ::timestamptz,
      (v_item ->> 'duration_min')::int,
      v_item ->> 'topic',
      v_item ->> 'note',
      v_series_id,
      v_item ->> 'color'
    from jsonb_array_elements_text(v_item -> 'occurrences') as occ;
  end loop;
end;
$$;
```

Заметки:

- `tutor_id` на `lesson_series` и `lesson` заполняет BEFORE-INSERT триггер из 0009 — поле в insert
  не передаём (как и сейчас в action).
- Пустой/`null` `p_series` → цикл по `[]` → no-op (FR-B3-4).
- `student_id` передаём один раз параметром (все серии — одного ученика, как в форме).
- Конфликт по времени **не** проверяем в SQL — остаётся в action (читает чужие уроки под RLS).

---

## Модуль 2 — чистый хелпер сборки полезной нагрузки (`src/features/lessons/recurrence.ts` или новый `series-payload.ts`)

Выносим формирование JSON в чистую функцию → её можно юнит-тестировать без БД.

```
TYPE SeriesPayloadItem = {
  rrule: string; dtstart: string; duration_min: number;
  topic: string | null; note: string | null; color: string | null;
  occurrences: string[];          # ISO-строки
}

FUNCTION buildSeriesPayload(plans, topic, note, color): SeriesPayloadItem[]
    # plans: [{ spec, plan:{duration_min}, occurrences: Date[] }] (как сейчас в recurrencePlans)
    RETURN plans.map(({ plan, spec, occurrences }) => ({
        rrule:        ruleToStored(buildRule(spec)),
        dtstart:      spec.dtstart.toISOString(),
        duration_min: plan.duration_min,
        topic, note, color,
        occurrences:  occurrences.map(d => d.toISOString()),
    }))
```

---

## Модуль 3 — рефактор `createLessonAction` (`src/features/lessons/actions.ts`)

Ветка `if (!repeating)` (одиночные уроки) — **без изменений**. Меняем только ветку повтора:

```
# ... после построения recurrencePlans (фильтр occurrences.length>0) и проверки конфликта:

# БЫЛО: for (const {plan, spec, occurrences} of recurrencePlans) { insert series; insert lessons }
# СТАЛО:
payload = buildSeriesPayload(recurrencePlans, topic, note, color)
IF payload.length === 0:
    RETURN { error: "Не удалось рассчитать даты" }

{ error } = await supabase.rpc("create_lesson_series", {
    p_student_id: student_id,
    p_series: payload,
})
IF error: RETURN { error: error.message }

revalidateLesson(student_id)
RETURN { ok: true }
```

Удаляются: цикл вставок, промежуточные `seriesError`/`insertError`, ручной `.select("id").single()`.

---

## Модуль 4 — типы `src/lib/supabase/database.types.ts`

После `db push` добавить сигнатуру RPC в секцию `Functions`:

```
create_lesson_series: {
  Args: { p_student_id: string; p_series: Json }
  Returns: undefined
}
```

(`Json` — уже импортируемый алиас в сгенерированных типах. Предпочтительно — регенерация типов.)

---

## TDD-анкеры

```
# Юнит (vitest) — чистый хелпер buildSeriesPayload (новый series-payload.test.ts):

TEST "маппит план в элемент payload":
    GIVEN один план (пн ×3), topic="Алгебра", note=null, color="violet"
    THEN  payload.length=1; item.occurrences.length=3 (ISO-строки);
          item.rrule начинается с "FREQ=WEEKLY"; item.duration_min совпадает

TEST "несколько дней → несколько элементов":
    GIVEN планы пн и чт  THEN payload.length=2, у каждого свой dtstart/occurrences

TEST "пустые планы → пустой payload":
    GIVEN []             THEN payload.length=0

# Контракт БД (psql) — атомарность:

TEST AC-B3-2 "rollback при сбое":
    WHEN create_lesson_series(student, [valid, {rrule:null,...}])  -- 2-й элемент нарушает NOT NULL
    THEN ошибка AND count(lesson_series нового студента)=0 AND count(lesson)=0  (всё откатилось)

TEST AC-B3-1 "успех — всё создано":
    WHEN create_lesson_series(student, [пн×8, чт×8])
    THEN 2 серии, 16 уроков, tutor_id проставлен триггером, series_id связан
```

Сквозной (ручной, UI): создать серию пн+чт ×8 → 16 уроков в расписании; повторить с конфликтом
времени → конфликт-ошибка как раньше (RPC не вызвался).

## Чек реализации

- [ ] `0011_create_series_tx.sql` создан и применён (`db push`).
- [ ] `database.types.ts`: RPC `create_lesson_series`.
- [ ] `buildSeriesPayload` выделен + покрыт юнит-тестами.
- [ ] `createLessonAction` (ветка повтора) использует один `rpc`; одиночная ветка не тронута.
- [ ] AC-B3-1…3 пройдены; `typecheck/lint/test/build` зелёные.
