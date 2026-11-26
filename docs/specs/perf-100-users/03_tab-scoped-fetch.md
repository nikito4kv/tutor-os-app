# Псевдокод — P3: выборка по активной вкладке + лимиты

Файлы: `src/app/(app)/students/[id]/page.tsx`, `src/features/lessons/queries.ts`,
`src/features/packages/queries.ts`, `src/features/homework/queries.ts`,
`src/features/students/queries.ts`, `src/lib/constants.ts`.
Требования: §4 спеки (`00_specification.md`). Сложность: средняя, без миграции.

## Текущее (всё, на любой вкладке, `select *`, без лимита)

```
# students/[id]/page.tsx
activeTab = resolveTab(searchParams)             # вычислен, но НЕ влияет на загрузку
student = AWAIT getStudent(id)
[packages, payments, lessons, homework, tutor] = AWAIT Promise.all([
    listPackages(id),            # select *
    listPayments(id),            # select *
    listLessonsByStudent(id),    # select *, ВСЕ уроки за всю историю, без limit
    listHomeworksByStudent(id),  # select *
    getCurrentTutor(),           # нужен только для currency (вкладка «Пакеты»)
])
lessonsLeft = packageBalance(packages)
# даже на «Обзоре» загружены payments/lessons/homework, которые там не нужны
```

## Целевое

### 1) Константа

```
# constants.ts
CONST STUDENT_HISTORY_LIMIT = 50   # потолок списков-истории в карточке ученика
```

### 2) Узкие запросы (явные колонки, лимиты)

```
# packages/queries.ts — лёгкий баланс (нужен на ВСЕХ вкладках)
getStudentBalance(studentId): number
    rows = supabase.from("package").select("lessons_left").eq("student_id", studentId)
    RETURN packageBalance(rows ?? [])           # та же формула (INV-P3-2)
# listPackages(studentId) — оставить (вкладка «Пакеты»), но select явных колонок

# lessons/queries.ts
listUpcomingLessons(studentId):                 # ближайшие — их единицы
    RETURN select(id, starts_at, duration_min, status, topic, note, color, series_id)
           .eq(student_id).eq(status,"scheduled").order(starts_at asc)
listLessonHistory(studentId, limit=STUDENT_HISTORY_LIMIT):
    RETURN select(<те же колонки>)
           .eq(student_id).neq(status,"scheduled").order(starts_at desc).limit(limit)
listLessonOptions(studentId, limit=STUDENT_HISTORY_LIMIT):   # для дропдауна привязки ДЗ
    RETURN select(id, starts_at, topic).eq(student_id).order(starts_at desc).limit(limit)

# homework/queries.ts — явные колонки + лимит (+ батч-подпись из P1)
listHomeworksByStudent(studentId):
    RETURN select(<нужные колонки>).eq(student_id).order(created_at desc)
           .limit(STUDENT_HISTORY_LIMIT)         # затем батч signed URLs (P1)

# students/queries.ts — для /schedule
listStudents(): select(id, name) ...            # было select * (FR-P3-4)
# getStudent(id) на карточке — оставить полный (нужны contact/level/share_token и т.д.)
```

### 3) Загрузка по активной вкладке (матрица §4)

```
# students/[id]/page.tsx
activeTab = resolveTab(searchParams)
student   = AWAIT getStudent(id);  IF !student: notFound()
lessonsLeft = AWAIT getStudentBalance(id)        # всегда (баланс-карточка над табами)

SWITCH activeTab:
  CASE "overview":
      # ничего сверх student + lessonsLeft (AC-P3-1)
  CASE "packages":
      [packages, payments, tutor] = AWAIT Promise.all([
          listPackages(id), listPayments(id), getCurrentTutor() ])  # currency только тут
      currency = isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY
  CASE "lessons":
      [upcoming, history] = AWAIT Promise.all([
          listUpcomingLessons(id), listLessonHistory(id) ])
  CASE "homework":
      [homework, lessonOptions] = AWAIT Promise.all([
          listHomeworksByStudent(id), listLessonOptions(id) ])

RENDER:
    BalanceCard(lessonsLeft, lowBalance = lessonsLeft <= LOW_BALANCE_THRESHOLD)
    Tabs(...)
    activeTab=="overview"  -> Overview(...)                       # без доп. данных
    activeTab=="packages"  -> PackagesTab(packages, payments, currency)
    activeTab=="lessons"   -> LessonsTab(upcoming, history, lessonsLeft)
    activeTab=="homework"  -> HomeworkTab(homework, lessonOptions)
```

`LessonsTab` больше **не** фильтрует один общий массив на upcoming/history в JS — получает
два готовых списка. `AddLesson` берёт `lastLessonAt` из `upcoming.at(-1) ?? history[0]`.
`AddHomework` получает `lessonOptions` (лёгкие `{id, starts_at, topic}`) вместо полных уроков.

## Заметки

- Баланс-карточка показывает только **число** (не деньги) → `currency`/`getCurrentTutor`
  нужен лишь вкладке «Пакеты» (FR-P3-5). Это убирает лишний `getCurrentTutor` с трёх вкладок
  (синергия с P2).
- Лимит истории — продуктово допустимая усечка (как `SHARE_UPCOMING_LIMIT`=10 для ссылки).
  «Показать ещё»/пагинацию в MVP не делаем (EC-P3-1) — фиксируем в спеке, не молча.
- `listLessonsByStudent` (старый, без лимита) можно удалить после миграции потребителей либо
  оставить помеченным deprecated — на усмотрение реализации; новый код его не использует.
- Колоночные списки в `select(...)` должны включать всё, что реально рисует `LessonList`/
  `HomeworkList` (цвет, статус, тема, длительность) — сверить с компонентами при реализации,
  чтобы не отвалился рендер (часть регресс-проверки AC-P3-5).
- Альтернатива — Suspense/стриминг по вкладкам — мощнее, но дальше от текущего паттерна
  (серверная сборка данных в page). Вне скоупа.

## TDD-анкеры

Запросы Supabase не юнит-тестируем; матрицу «вкладка → набор запросов» выносим в чистую
функцию-резолвер и тестируем её; объём выборки — контрактом.

```
# Юнит (vitest) — резолвер плана загрузки (чистая функция)
TEST "overview plan loads only student+balance":
    THEN  planFor("overview") == { balance:true, packages:false, payments:false,
                                    lessons:false, homework:false, tutor:false }   # AC-P3-1
TEST "lessons plan loads upcoming+history, not payments/homework":
    THEN  planFor("lessons").lessons == true AND planFor("lessons").payments == false  # AC-P3-2
TEST "unknown tab → overview plan":
    THEN  planFor("zzz") == planFor("overview")                    # EC-P3-3

# Контракт БД/сети (ручной / логи)
TEST "overview tab issues no payments/lessons/homework queries"   # AC-P3-1
TEST "no select(*) in touched queries"                            # AC-P3-3 (код-ревью/grep)
TEST "/schedule selects students as id,name"                      # AC-P3-4

# Сквозной (ручной)
TEST "all four tabs render same content as before (within limit)" # AC-P3-5
```
