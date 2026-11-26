# Псевдокод — L1–L4: полировка

Требования: §5 спеки. Все без миграции, низкая сложность.

---

## L1 — лимит заметки урока (`src/features/lessons/schema.ts`)

Сейчас `optionalText` (max 500) общий для `topic` и `note`, а форма показывает счётчик `N/200`.
Разносим лимиты; `note` равняем на `LESSON_NOTE_MAX`.

```
IMPORT { DEFAULT_LESSON_DURATION_MIN, LESSON_NOTE_MAX } from "@/lib/constants"

# фабрика опционального текста с явным лимитом
FUNCTION optionalText(max):
    RETURN z.string().trim().max(max).optional().transform(v => v ? v : null)

LESSON_TOPIC_MAX = 200   # локальная константа или вынести в constants.ts

lessonSchema = z.object({
    student_id:   z.string().uuid("Выберите ученика"),
    starts_at:    z.coerce.date({ invalid_type_error: "Укажите дату и время" }),
    duration_min: z.coerce.number(...).int(...).positive(...).default(DEFAULT_LESSON_DURATION_MIN),
    topic:        optionalText(LESSON_TOPIC_MAX),
    note:         optionalText(LESSON_NOTE_MAX),     # 200 — совпадает со счётчиком формы
})
```

Заметки:

- `lessonEditSchema = lessonSchema.omit({ student_id: true })` наследует новые лимиты автоматически.
- Форма `add-lesson.tsx` уже ставит `maxLength={LESSON_NOTE_MAX}` — менять не нужно.

### TDD-анкер (`src/features/lessons/schema.test.ts`)

```
TEST "note over LESSON_NOTE_MAX is rejected":
    parse note = "a".repeat(LESSON_NOTE_MAX + 1)  ⇒  success == false      # AC-L1
TEST "note at LESSON_NOTE_MAX passes":
    parse note = "a".repeat(LESSON_NOTE_MAX)      ⇒  success == true
TEST "empty note becomes null":
    parse note = ""  ⇒  data.note == null
```

(парсим через `parseLessonForm` с валидными `student_id`/`starts_at`/`duration_min`.)

---

## L2 — единый порог низкого баланса (`src/features/lessons/actions.ts`)

Перестаём доверять полю БД `low_balance`; считаем из TS-константы.

```
IMPORT { LOW_BALANCE_THRESHOLD } from "@/lib/constants"

# completeLessonAction (после успешного rpc):
r = data as { lessons_left: number }
RETURN { ok: true,
         lessonsLeft: r.lessons_left,
         lowBalance: r.lessons_left <= LOW_BALANCE_THRESHOLD }   # ← из константы

# markNoShowAction — аналогично:
r = data as { lessons_left: number }
RETURN { ok: true,
         lessonsLeft: r.lessons_left,
         lowBalance: r.lessons_left <= LOW_BALANCE_THRESHOLD }
```

SQL не меняем (миграции не нужно). В `complete_lesson` (миграции 0001/0004) оставить `<= 2`
и добавить комментарий: «канонический порог — `LOW_BALANCE_THRESHOLD` в `src/lib/constants.ts`;
поле `low_balance` оставлено для совместимости, UI его игнорирует». (Комментарий правим в
исходнике миграции для будущего читателя; уже применённую миграцию не перенакатываем.)

### TDD-анкер

Логика — внутри action (нужен Supabase-мок). Достаточно ручной проверки AC-L2: временно
изменить `LOW_BALANCE_THRESHOLD` и убедиться, что баннер «пора пополнить» реагирует без правки SQL.

---

## L3 — цвет дедлайна ДЗ

### Модуль: чистая функция `src/features/homework/deadline.ts` (новый)

```
FUNCTION isHomeworkOverdue(
    dueAt: string | null,
    status: HomeworkStatus,
    now: number = Date.now()
) RETURNS boolean:
    IF dueAt == null: RETURN false
    IF status == "reviewed": RETURN false
    RETURN new Date(dueAt).getTime() < now
```

### Применение — `src/features/homework/homework-list.tsx`

```
IMPORT isHomeworkOverdue
now = Date.now()
# блок срока:
overdue = isHomeworkOverdue(item.due_at, item.status, now)
<p className={overdue ? "text-warning" : "text-muted-foreground"}>
    {t.homework.due}: {formatDateTime(item.due_at)}
    {overdue ? ` · ${t.homework.overdue}` : ""}      # опц. суффикс
</p>
```

### Применение — `src/app/s/[token]/page.tsx`

То же на странице ученика. `ShareView.homework` отдаёт `due_at` и `status` (уже есть в выборке).

```
overdue = isHomeworkOverdue(hw.due_at, hw.status, now)
<p className={overdue ? "text-warning" : "text-muted-foreground"}> ... </p>
```

### i18n (опц.) `src/lib/i18n/ru.ts`, секция `homework`

```
overdue: "просрочено",
```

### TDD-анкер (`src/features/homework/deadline.test.ts`)

```
now = Date(2026,5,13,15,0).getTime()
TEST future due → false:        isHomeworkOverdue(Date(2026,5,20).toISO, "assigned", now) == false   # AC-L3
TEST past due, not reviewed → true: isHomeworkOverdue(Date(2026,5,10).toISO, "submitted", now) == true
TEST past due, reviewed → false:    isHomeworkOverdue(Date(2026,5,10).toISO, "reviewed", now) == false
TEST no due date → false:           isHomeworkOverdue(null, "assigned", now) == false
```

---

## L4 — лимит будущих уроков на странице ученика

### `src/lib/constants.ts`

```
# Сколько ближайших уроков показывать на публичной странице ученика.
SHARE_UPCOMING_LIMIT = 10
```

### `src/features/share/queries.ts`

```
IMPORT { SHARE_UPCOMING_LIMIT } from "@/lib/constants"
# запрос lessons:
supabase.from("lesson")
        .select("id, starts_at, topic, duration_min")
        .eq("student_id", student.id)
        .eq("status", "scheduled")
        .order("starts_at", { ascending: true })
        .limit(SHARE_UPCOMING_LIMIT)              # ← добавлено
```

### TDD-анкер

Запрос к БД — проверяем вручную (AC-L4): серия из 52 уроков → на `/s/[token]` максимум 10.

---

## Порядок и проверка

1. L1 (schema + test) · L2 (actions) · L4 (constants + query) — дешёвые, без миграции.
2. L3 (deadline.ts + test + 2 вьюхи + i18n).
3. Общая проверка: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — зелёные, без `any`.
4. Ручные AC-L1…L4.
