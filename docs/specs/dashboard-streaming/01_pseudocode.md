# Псевдокод — стриминг дашборда через `<Suspense>`

Фаза **P** (Pseudocode) SPARC. Опирается на [`00_specification.md`](00_specification.md).
Здесь — целевое дерево, `cache()`-обёртки, тонкие async-загрузчики, композиция страницы.

## Целевое дерево файлов

```
src/app/(app)/dashboard/
  page.tsx                 # оболочка + сетка + <Suspense> вокруг каждого загрузчика
  loading.tsx              # route-fallback (переиспользует скелеты ниже)
src/features/dashboard/
  shared.ts                # cache()-обёртки общих данных (имена учеников, валюта)
  skeletons.tsx            # per-card скелеты (вынесены из loading.tsx)
  loaders/
    next-lesson-loader.tsx     # async: getNextLesson + имена → <NextLessonCard/>
    month-income-loader.tsx    # async: listPaymentAmountsInRange + валюта → <MonthIncomeCard/>
    today-lessons-loader.tsx   # async: listLessonsInRange(today) + имена → <TodayLessons/>
    inbox-loader.tsx           # async: 3 запроса + имена → <ActionInbox/>
    low-balance-loader.tsx     # async: students + balances → aggregate → <LowBalanceStudents/>
  # presentational-компоненты карточек — БЕЗ ИЗМЕНЕНИЙ:
  next-lesson-card.tsx  month-income-card.tsx  today-lessons.tsx
  action-inbox.tsx      low-balance-students.tsx
  aggregate.ts  aggregate.test.ts   # не трогаем
  queries.ts                          # getDashboardData можно удалить или оставить устаревшим
```

## `shared.ts` — дедупликация общих данных через `cache()`

```ts
import { cache } from "react";
import { listStudentOptions } from "@/features/students/queries";
import { getCurrentTutor } from "@/lib/auth"; // уже cache()
import { DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from "@/lib/currency";

// Один вызов на запрос, сколько бы загрузчиков ни звали (React per-request dedupe).
export const getStudentNameMap = cache(async (): Promise<Map<string, string>> => {
  const students = await listStudentOptions();
  return new Map(students.map((s) => [s.id, s.name]));
});

export const getDashboardCurrency = cache(async (): Promise<CurrencyCode> => {
  const tutor = await getCurrentTutor();
  return isCurrencyCode(tutor.currency) ? tutor.currency : DEFAULT_CURRENCY;
});

// Локальный хелпер мёрджа (тот же, что был в getDashboardData)
export function withStudent<T extends { student_id: string }>(
  lesson: T,
  names: Map<string, string>,
): T & { student: { name: string } } {
  return { ...lesson, student: { name: names.get(lesson.student_id) ?? "—" } };
}
```

> `LowBalanceStudents` тоже зовёт `listStudentOptions` (ему нужны и id, и name) —
> можно переиспользовать `getStudentNameMap` (даст имена) либо звать
> `listStudentOptions` напрямую: благодаря `cache()` это всё равно один запрос.

## Загрузчики (тонкие async server components)

```tsx
// loaders/next-lesson-loader.tsx
import { getNextLesson } from "@/features/lessons/queries";
import { NextLessonCard } from "../next-lesson-card";
import { getStudentNameMap, withStudent } from "../shared";

export async function NextLessonLoader() {
  const [lesson, names] = await Promise.all([getNextLesson(), getStudentNameMap()]);
  return <NextLessonCard lesson={lesson ? withStudent(lesson, names) : null} />;
}
```

```tsx
// loaders/month-income-loader.tsx
import { listPaymentAmountsInRange } from "@/features/payments/queries";
import { monthRange, startOfMonth } from "@/lib/date";
import { MonthIncomeCard } from "../month-income-card";
import { getDashboardCurrency } from "../shared";
import { sumAmounts } from "../aggregate";

export async function MonthIncomeLoader() {
  const month = monthRange(startOfMonth(new Date()));
  const [amounts, currency] = await Promise.all([
    listPaymentAmountsInRange(month.from, month.to),
    getDashboardCurrency(),
  ]);
  return <MonthIncomeCard amount={sumAmounts(amounts)} currency={currency} />;
}
```

```tsx
// loaders/today-lessons-loader.tsx
import { listLessonsInRange } from "@/features/lessons/queries";
import { addDays } from "@/lib/date";
import { TodayLessons } from "../today-lessons";
import { getStudentNameMap, withStudent } from "../shared";

export async function TodayLessonsLoader() {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = addDays(dayStart, 1);
  const [lessons, names] = await Promise.all([
    listLessonsInRange(dayStart.toISOString(), dayEnd.toISOString()),
    getStudentNameMap(),
  ]);
  return <TodayLessons lessons={lessons.map((l) => withStudent(l, names))} />;
}
```

```tsx
// loaders/inbox-loader.tsx
import { listOverdueLessons } from "@/features/lessons/queries";
import { listHomeworkToReview, listOverdueHomework } from "@/features/homework/queries";
import { ActionInbox } from "../action-inbox";
import { getStudentNameMap, withStudent } from "../shared";
// toInboxItem — тот же мёрдж, что был в getDashboardData (вынести сюда или в shared)

export async function InboxLoader() {
  const [toReview, overdueLessons, overdueHw, names] = await Promise.all([
    listHomeworkToReview(),
    listOverdueLessons(),
    listOverdueHomework(),
    getStudentNameMap(),
  ]);
  const inbox = {
    toReview: toReview.map((h) => toInboxItem(h, names)),
    overdueLessons: overdueLessons.map((l) => withStudent(l, names)),
    overdueHomework: overdueHw.map((h) => toInboxItem(h, names)),
    get total() {
      /* как было: сумма длин */
    },
  };
  return <ActionInbox inbox={inbox} />;
}
```

```tsx
// loaders/low-balance-loader.tsx
import { listPackageBalances } from "@/features/packages/queries";
import { listStudentOptions } from "@/features/students/queries"; // cache() дедуплицирует
import { selectLowBalanceStudents } from "../aggregate";
import { LowBalanceStudents } from "../low-balance-students";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";

export async function LowBalanceLoader() {
  const [students, packages] = await Promise.all([listStudentOptions(), listPackageBalances()]);
  return (
    <LowBalanceStudents
      students={selectLowBalanceStudents(students, packages, LOW_BALANCE_THRESHOLD)}
    />
  );
}
```

## `skeletons.tsx` — per-card fallback (вынести из текущего loading.tsx)

```tsx
import { Skeleton } from "@/components/ui/skeleton";
export const NextLessonSkeleton = () => <Skeleton className="h-40 w-full lg:col-span-2" />;
export const MonthIncomeSkeleton = () => <Skeleton className="h-40 w-full" />;
export const CardSkeleton = () => <Skeleton className="h-64 w-full" />; // today / inbox
export const LowBalanceSkeleton = () => <Skeleton className="h-24 w-full" />;
```

`loading.tsx` переписать через эти же скелеты, чтобы route-fallback и
Suspense-fallback совпадали визуально (единый источник правды).

## `page.tsx` — композиция со `<Suspense>`

```tsx
import { Suspense } from "react";
import { NextLessonLoader } from "@/features/dashboard/loaders/next-lesson-loader";
// ...остальные загрузчики и скелеты
export const dynamic = "force-dynamic"; // сохраняем

export default function DashboardPage() {
  // больше НЕ async — данных тут нет
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.welcome}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<NextLessonSkeleton />}>
            <NextLessonLoader />
          </Suspense>
        </div>
        <Suspense fallback={<MonthIncomeSkeleton />}>
          <MonthIncomeLoader />
        </Suspense>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton />}>
          <TodayLessonsLoader />
        </Suspense>
        <Suspense fallback={<CardSkeleton />}>
          <InboxLoader />
        </Suspense>
      </div>

      <Suspense fallback={<LowBalanceSkeleton />}>
        <LowBalanceLoader />
      </Suspense>
    </div>
  );
}
```

Заголовок и сетка теперь рендерятся синхронно и уходят клиенту сразу; каждая
карточка дорисовывается по мере готовности своего среза.

## Обработка ошибок (решение по открытому вопросу phase 1)

По умолчанию — **оставить общий `error.tsx`** (минимум усложнения для MVP). Если
нужна изоляция: завернуть отдельные загрузчики в client-`ErrorBoundary`, который
рендерит `<ErrorState/>`. Делать только при дешёвой реализации; иначе зафиксировать
«отложено» и не тащить в этот PR (правила проекта — режем скоуп).

## Пошаговый план миграции

1. `shared.ts`: `getStudentNameMap` (`cache()`), `getDashboardCurrency` (`cache()`),
   `withStudent`, `toInboxItem`. `pnpm typecheck`.
2. `skeletons.tsx`: вынести скелеты; переписать `loading.tsx` через них.
3. Создать 5 загрузчиков в `loaders/` (логика мёрджа 1:1 из `getDashboardData`).
4. Переписать `page.tsx`: убрать `async`/`getDashboardData`, обернуть загрузчики
   в `<Suspense>` с нужными скелетами. `dynamic="force-dynamic"` оставить.
5. Удалить `getDashboardData` из `queries.ts` (или пометить устаревшим, если на
   него кто-то ещё ссылается — проверить grep).
6. Проверить дедупликацию `listStudentOptions` (один запрос на загрузку дашборда).
7. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` + Playwright по
   сценариям из phase 1.

## Риски и на что смотреть

- **Дедупликация работает только в рамках одного запроса** и только если все
  зовут одну и ту же `cache()`-обёртку из `shared.ts` (не каждый свою копию).
- **`force-dynamic` + Suspense** — стриминг работает; убедиться, что нет случайной
  статической оптимизации (её и так нет из-за cookies Supabase).
- **Date/now расхождение** между загрузчиками (каждый берёт свой `new Date()`) —
  на «сегодня/этот месяц» неважно; если потребуется единый момент, прокинуть его
  пропом из `page.tsx`.
- **Регресс по числу запросов** — главный риск; ловится проверкой из п.6.
