# Псевдокод — B4: гард повторного создания ДЗ при завершении

Требования: §5 спеки. Сложность: тривиальная. Затрагивает только `completeLessonAction`
(`src/features/lessons/actions.ts`). Без миграции, без UI, без изменения типов схемы.

---

## Модуль 1 — `completeLessonAction`

`complete_lesson` уже возвращает `already_done` (true, когда урок был терминальным и повторный
вызов — идемпотентный no-op). Баланс при этом не списывается повторно, а вот создание ДЗ сейчас
выполняется безусловно. Достаточно повесить тот же флаг на блок создания ДЗ.

### Текущий поток (сокращённо)

```
{ data, error } = supabase.rpc("complete_lesson", { p_lesson_id, p_topic, p_note })
IF error: RETURN { error }

hwTitle = optionalString(formData.get("title"))
IF hwTitle:                                  # ← создаётся ВСЕГДА (баг B4)
    hwErr = createHomeworkFromForm({ ... })
    IF hwErr: RETURN { error: hwErr }

r = data as { lessons_left }
RETURN { ok, lessonsLeft: r.lessons_left, lowBalance: r.lessons_left <= LOW_BALANCE_THRESHOLD }
```

### Изменение

```
r = data as { lessons_left: number; already_done?: boolean }   # ← читаем флаг

hwTitle = optionalString(formData.get("title"))
IF hwTitle AND r.already_done !== true:       # ← создаём ДЗ только при ПЕРВОМ завершении
    hwErr = createHomeworkFromForm({ ... })
    IF hwErr: RETURN { error: hwErr }

RETURN { ok, lessonsLeft: r.lessons_left, lowBalance: r.lessons_left <= LOW_BALANCE_THRESHOLD }
```

Заметки:

- Тип `r` расширяется до `{ lessons_left: number; already_done?: boolean }` — без `any`.
- `markNoShowAction` ДЗ не создаёт → его не трогаем.
- Семантика: повторная отправка формы завершения (двойной сабмит, ретрай) на уже завершённом
  уроке не плодит ДЗ; баланс и так защищён идемпотентностью `complete_lesson`.

---

## TDD-анкеры

ДЗ создаётся через серверный путь (`createHomeworkFromForm`, нужен Supabase) — юнит без DB не
снимем. Проверяем логику гарда через сквозной сценарий и (опц.) лёгкий рефактор-вынос условия.

```
# Сквозной (ручной, UI):
TEST AC-B4-1 "двойной сабмит → одна ДЗ":
    GIVEN урок scheduled, в форме завершения заполнен title
    WHEN  быстро отправить форму дважды
    THEN  урок done (списан 1), создана РОВНО одна ДЗ (вторая отбита already_done)

TEST AC-B4-2 "обычное завершение с ДЗ — регресс не внесён":
    GIVEN урок scheduled, title заполнен
    WHEN  отправить один раз
    THEN  ДЗ создана
```

(Опц.) Вынести предикат в чистую функцию для юнита:
`shouldCreateHomework(hwTitle: string | null, alreadyDone: boolean | undefined): boolean`
→ `!!hwTitle && alreadyDone !== true`. Тогда — тривиальный vitest на таблицу истинности.

## Чек реализации

- [ ] `completeLessonAction`: тип `r` расширен, блок ДЗ под `&& r.already_done !== true`.
- [ ] AC-B4-1/2 подтверждены вручную; `typecheck/lint/test/build` зелёные.
