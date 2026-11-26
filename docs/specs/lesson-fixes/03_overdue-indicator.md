# Псевдокод — C3: индикатор просроченных уроков

Требования: §4 спеки. Сложность: средняя, без миграции. Чистая функция + 2 вьюхи + i18n.

---

## Модуль 1 — чистая функция `src/features/lessons/overdue.ts` (новый)

Единый источник правды «урок ждёт завершения». Чистая → юнит-тестируема (не `server-only`,
чтобы импортироваться в клиентских и серверных компонентах и в тесте).

```
# Просрочен = запланирован, но время уже прошло.
FUNCTION isLessonOverdue(
    lesson: { status: LessonStatus; starts_at: string },
    now: number = Date.now()
) RETURNS boolean:
    RETURN lesson.status == "scheduled"
       AND  new Date(lesson.starts_at).getTime() < now
```

Заметки:

- Сравнение по абсолютному времени (не по календарному дню) — урок ранее сегодня просрочен.
- Время наивно-локальное, как весь MVP (`date.ts`).
- `now` параметризуем — для детерминизма в тестах.

---

## Модуль 2 — сетка недели `src/features/lessons/week-calendar.tsx`

Компонент уже получает `today: Date`. Для каждого урока считаем признак и показываем чип.
Сейчас бейдж рисуется только для `status !== "scheduled"` — добавляем отдельную ветку для
просроченного `scheduled`.

```
IMPORT isLessonOverdue
# внутри map по dayLessons:
overdue = isLessonOverdue(lesson, today.getTime())

# в теле чипа, блок статуса:
IF lesson.status != "scheduled":
    <LessonStatusBadge status={lesson.status} />
ELSE IF overdue:
    <Badge variant="warning">{t.lessons.overdue}</Badge>     # ← новое
# (обычный будущий scheduled — без бейджа, как сейчас)
```

Опционально усилить акцент рамки: добавить класс при `overdue` (напр. `ring-1 ring-warning/40`).

---

## Модуль 3 — список `src/features/lessons/lesson-list.tsx`

Серверный компонент, `today` не получает → берём `now` локально один раз.

```
IMPORT isLessonOverdue
FUNCTION LessonList({ lessons, showStudent, order }):
    now = Date.now()                       # один раз на рендер
    groups = groupLessonsByDay(lessons, order == "desc")
    ...
    # в строке урока, рядом со статус-бейджем:
    overdue = isLessonOverdue(lesson, now)
    IF overdue:
        <Badge variant="warning">{t.lessons.overdue}</Badge>
    ELSE:
        <LessonStatusBadge status={lesson.status} />
```

Заметки:

- «Предстоящие» в карточке ученика рендерятся через `LessonList` → как раз нужное место.
- История (`order="desc"`) содержит только не-`scheduled` → `isLessonOverdue` всегда false → без изменений (FR-C3-3).
- Визуальный выбор: `warning`-вариант уже занят `canceled` в `LessonStatusBadge`, но для
  `scheduled` обычный бейдж нейтральный/отсутствует, поэтому warning-чип «Пора завершить»
  читается как явный сигнал. Допустимо.

---

## Модуль 4 — i18n (`src/lib/i18n/ru.ts`, секция `lessons`)

```
overdue: "Пора завершить",
```

---

## Модуль 5 (опционально, отдельный шаг) — баннер на `/schedule`

```
# в SchedulePage, после загрузки lessons:
overdueCount = lessons.filter(l => isLessonOverdue(l, Date.now())).length
IF overdueCount > 0:
    <Banner variant="warning">{t.lessons.overdueBanner(overdueCount)}</Banner>
```

Требует доп. строки i18n с подстановкой числа. Делать только если возьмём — на основной
индикатор не влияет.

---

## TDD-анкеры (`src/features/lessons/overdue.test.ts`)

```
IMPORT { isLessonOverdue } from "./overdue"

FIXTURE now = Date(2026, 5, 13, 15, 0).getTime()   # 13 июн 2026, 15:00

TEST "scheduled in the past is overdue":
    isLessonOverdue({status:"scheduled", starts_at: Date(2026,5,12,18,0).toISO}, now) == true   # AC-C3-1

TEST "scheduled earlier today is overdue":
    isLessonOverdue({status:"scheduled", starts_at: Date(2026,5,13,9,0).toISO}, now) == true     # EC-C3-1

TEST "scheduled in the future is not overdue":
    isLessonOverdue({status:"scheduled", starts_at: Date(2026,5,14,18,0).toISO}, now) == false    # AC-C3-2

TEST "canceled in the past is not overdue":
    isLessonOverdue({status:"canceled", starts_at: Date(2026,5,12,18,0).toISO}, now) == false      # AC-C3-3 / EC-C3-3

TEST "done in the past is not overdue":
    isLessonOverdue({status:"done", starts_at: Date(2026,5,12,18,0).toISO}, now) == false           # EC-C3-3

TEST "defaults now to Date.now() when omitted":
    isLessonOverdue({status:"scheduled", starts_at: Date(2000,0,1).toISO}) == true
```

## Чек реализации

- [ ] `overdue.ts` + `overdue.test.ts` (зелёные, AC-C3-4).
- [ ] Пометка в `week-calendar.tsx` и `lesson-list.tsx`.
- [ ] i18n `overdue`.
- [ ] Ручной AC-C3-1/2/3.
