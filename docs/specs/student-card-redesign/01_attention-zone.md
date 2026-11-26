# Псевдокод — A: зона «Требует внимания»

Требования: §3 спеки. Сложность: средняя. Чистая функция + 1 head-COUNT + блок в обзоре + i18n.
Главный UX-выигрыш редизайна: карточка отвечает «что сделать прямо сейчас».

---

## Модуль 1 — чистый агрегат `src/features/students/overview.ts`

Рядом с `buildActivityFeed` (тот же файл, тот же стиль — free of Supabase/React, юнит-тестируем).

```
# Типы
TYPE AttentionItem =
  | { kind: "review";     count: number }   # ДЗ сданы, ждут проверки тьютором (submitted)
  | { kind: "overdue";    count: number }   # ученик просрочил невыполненную ДЗ (assigned, due<now)
  | { kind: "noUpcoming" }                  # нет ближайшего scheduled-урока

TYPE AttentionInput = { toReview: number; overdue: number; noUpcoming: boolean }

# Приоритет: кто ждёт ТЕБЯ → кто просрочил → что запланировать.
FUNCTION buildAttentionItems(input: AttentionInput) RETURNS AttentionItem[]:
    items = []
    IF input.toReview > 0:  items.push({ kind: "review",  count: input.toReview })
    IF input.overdue  > 0:  items.push({ kind: "overdue", count: input.overdue })
    IF input.noUpcoming:    items.push({ kind: "noUpcoming" })
    RETURN items
```

Заметки:

- Порядок фиксирован кодом (FR-A-2) — не сортировка, а явные ветки.
- `review` и `overdue` приходят из РАЗНЫХ выборок (`submitted` vs `assigned`) → INV-A-1, не
  пересекаются. Чистая функция их не «дедупит» — изоляция гарантируется на уровне запросов.
- Пустой массив = «всё в порядке» (рендер решает, что показать).

---

## Модуль 2 — данные `src/features/students/queries.ts`

Добавляем счётчик просрочки **только** в обзорную выборку (не в `getStudentTabCounts`, чтобы
non-overview вкладки не получили лишний запрос — INV-X2).

```
# интерфейс
INTERFACE StudentOverview:
    nextLesson: Lesson | null
    totalPaid: number
    recentLessons: Lesson[]
    lastPayment: Payment | null
    currency: CurrencyCode
    homeworkOverdue: number        # ← новое

FUNCTION getStudentOverview(id):
    nowIso = new Date().toISOString()
    [upcoming, payments, recentLessons, tutor, overdue] = await Promise.all([
        listUpcomingLessons(id),
        listPayments(id),
        listLessonHistory(id, 3),
        getCurrentTutor(),
        # один head-COUNT: невыполненная просроченная ДЗ
        supabase.from("homework")
            .select("*", { count: "exact", head: true })
            .eq("student_id", id)
            .eq("status", "assigned")          # НЕ submitted/reviewed → не пересекается с toReview
            .not("due_at", "is", null)
            .lt("due_at", nowIso),
    ])
    IF overdue.error: throw new Error(overdue.error.message)
    RETURN {
        nextLesson: pickNextLesson(upcoming),
        totalPaid: sumPaid(payments),
        recentLessons,
        lastPayment: payments[0] ?? null,
        currency: isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY,
        homeworkOverdue: overdue.count ?? 0,
    }
```

Заметки:

- `head: true` → строки не тянем, только число (как в `getStudentTabCounts`).
- Запрос добавлен в существующий `Promise.all` — без лишнего round-trip latency.
- `.not("due_at","is",null).lt("due_at", nowIso)` ⇔ предикат `isHomeworkOverdue` для
  `status='assigned'` (EC-A-3/A-4 выполняются фильтром).

---

## Модуль 3 — рендер зоны в `src/features/students/student-overview.tsx`

`StudentOverview` уже получает `homeworkToReview` и `overview`. Добавляем проп `lessonsLeft`
(для `AddLesson`-хинта в строке `noUpcoming`) — он есть в `page.tsx`.

```
IMPORT { buildAttentionItems } from "./overview"
IMPORT { AddLesson } from "@/features/lessons/add-lesson"
IMPORT { AlertTriangle, ClipboardCheck, CalendarPlus, Check } from "lucide-react"

FUNCTION StudentOverview({ studentId, student, shareUrl, homeworkToReview, lessonsLeft, overview }):
    items = buildAttentionItems({
        toReview: homeworkToReview,
        overdue: overview.homeworkOverdue,
        noUpcoming: overview.nextLesson == null,
    })
    ...
    # ПЕРВЫМ блоком контента обзора (до KPI):
    RENDER <AttentionZone studentId={studentId} lessonsLeft={lessonsLeft} items={items} />
    ...

# --- подкомпонент в этом же файле ---
FUNCTION AttentionZone({ studentId, lessonsLeft, items }):
    IF items.length == 0:
        RETURN <p className="text-sm text-muted-foreground">{t.students.attention.allClear}</p>

    RETURN (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t.students.attention.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map(item => <AttentionRow key={item.kind} studentId lessonsLeft item />)}
        </CardContent>
      </Card>
    )

FUNCTION AttentionRow({ studentId, lessonsLeft, item }):
    SWITCH item.kind:
      CASE "review":
        RETURN row(
          icon=<ClipboardCheck className="size-4 text-muted-foreground" />,
          text=t.students.attention.reviewPending, badge=item.count,
          action=<LinkAction href={`/students/${studentId}?tab=homework`}
                             label={t.students.attention.reviewAction} />)
      CASE "overdue":
        RETURN row(
          icon=<AlertTriangle className="size-4 text-warning" />,
          text=t.students.attention.overdue, badge=item.count,
          action=<LinkAction href={`/students/${studentId}?tab=homework`}
                             label={t.students.attention.overdueAction} />)
      CASE "noUpcoming":
        RETURN row(
          icon=<CalendarPlus className="size-4 text-muted-foreground" />,
          text=t.students.attention.noUpcoming, badge=null,
          action=<AddLesson studentId={studentId} lessonsLeft={lessonsLeft} />)

# row(): flex items-center justify-between gap-3 text-sm; слева icon+text(+Badge), справа action
# LinkAction: <Link className={cn(buttonVariants({variant:"outline", size:"sm"}), focusRing? )}>
#   — buttonVariants уже включает focus-ring; для <Link> добавь focusRing если нужно (§9)
```

Заметки:

- Цвет = не единственный носитель смысла (§9): у `overdue` и иконка `AlertTriangle`, и текст.
- `warning` берётся токеном (`text-warning`), не сырым цветом (INV-X3).
- `AddLesson` — готовый клиентский диалог; в строке внимания он рендерит свою кнопку
  «+ Добавить урок» (отдельный `trigger` не обязателен).
- Зона — первый блок (FR-A-7); в раскладке L уедет в главную колонку.

---

## Модуль 4 — i18n (`src/lib/i18n/ru.ts`, секция `students`)

Считаем счётчики в JSX рядом с меткой/в `Badge` (как `{purchased} {t.packages.lessonsUnit}`),
без функций-интерполяций.

```
attention: {
  title: "Требует внимания",
  allClear: "Сейчас ничего не требует внимания",
  reviewPending: "ДЗ ждут проверки",
  reviewAction: "Проверить",
  overdue: "Просроченная домашка",
  overdueAction: "Открыть",
  noUpcoming: "Нет запланированных уроков",
},
```

---

## TDD-анкеры (`src/features/students/overview.test.ts`, дополнение)

```
IMPORT { buildAttentionItems } from "./overview"

TEST "empty when nothing needs attention":           # EC-A-1 / AC-A-4
    buildAttentionItems({ toReview:0, overdue:0, noUpcoming:false }) == []

TEST "review item carries its count":                 # AC-A-1
    buildAttentionItems({ toReview:3, overdue:0, noUpcoming:false })
      == [{ kind:"review", count:3 }]

TEST "overdue item carries its count":                # AC-A-2
    buildAttentionItems({ toReview:0, overdue:2, noUpcoming:false })
      == [{ kind:"overdue", count:2 }]

TEST "noUpcoming item present when no next lesson":   # AC-A-3
    buildAttentionItems({ toReview:0, overdue:0, noUpcoming:true })
      == [{ kind:"noUpcoming" }]

TEST "fixed priority order review → overdue → noUpcoming":   # FR-A-2
    map(.kind, buildAttentionItems({ toReview:1, overdue:1, noUpcoming:true }))
      == ["review", "overdue", "noUpcoming"]
```

## Чек реализации

- [ ] `buildAttentionItems` + типы в `overview.ts`; тесты зелёные (AC-A-5).
- [ ] `homeworkOverdue` (один head-COUNT, `assigned`+`due_at<now`) в `getStudentOverview` и в интерфейсе.
- [ ] `AttentionZone`/`AttentionRow` первым блоком обзора; пусто → слим-строка `allClear`.
- [ ] i18n `students.attention.*`.
- [ ] non-overview вкладки не делают COUNT просрочки (AC-A-6).
- [ ] Светлая+тёмная: `text-warning` читается; иконка дублирует смысл (§9).
- [ ] Ручной AC-A-1…A-4.
