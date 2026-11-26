# Псевдокод — разбить `lesson-detail-dialog.tsx` на модули + ленивые режимы

Фаза **P** (Pseudocode) SPARC. Опирается на [`00_specification.md`](00_specification.md).
Здесь — целевое дерево файлов, контракты модулей и пошаговый механический план.

## Целевое дерево файлов

```
src/features/lessons/
  lesson-detail-dialog.tsx        # тонкий barrel: re-export публичного API (путь сохраняется)
  lesson-detail/
    dialog.tsx                    # LessonDetailDialog: триггер + Dialog-оболочка + open state
    detail-inner.tsx              # LessonDetailInner: загрузка детали, switch режимов, lazy-импорты
    view-mode.tsx                 # ViewMode (+ локальный Row)
    edit-mode.tsx                 # EditMode            (lazy)
    reschedule-mode.tsx           # RescheduleMode      (lazy)
    complete-mode.tsx             # CompleteMode        (lazy)
    parts.tsx                     # LowBalanceBanner, ModeSkeleton, типы Mode/Confirmable
```

Почему `lesson-detail/` подпапкой зоны, а не плоско: режимов 4 + общие части,
держим их вместе и не засоряем корень зоны `lessons`.

## Контракт публичного API (не меняется)

```ts
// lesson-detail-dialog.tsx  — barrel, чтобы 5 импортёров не трогать
export { LessonDetailDialog } from "./lesson-detail/dialog";
```

```ts
// lesson-detail/dialog.tsx
"use client";
// props и поведение идентичны текущим (строки 69–94 оригинала)
export function LessonDetailDialog(props: {
  lesson: Lesson;
  studentName?: string;
  children: React.ReactNode; // триггер
}): JSX.Element;
// внутри: useState(open); <Dialog><DialogTrigger>{children}</><DialogContent>
//   {open ? <LessonDetailInner .../> : null}  // монтаж только при open — инвариант
```

## `parts.tsx` — общие части (без `"use client"`, чистый JSX/типы)

```ts
export type Mode = "view" | "edit" | "reschedule" | "complete";
export type Confirmable = "cancel" | "delete" | "noShow" | "reopen";

// перенос 1:1 из строк 52–61
export function LowBalanceBanner({ lessonsLeft }: { lessonsLeft: number }): JSX.Element;

// новый: единый fallback для lazy-режимов (совпадает по высоте с формой)
export function ModeSkeleton(): JSX.Element;
//   <div className="space-y-4">
//     <Skeleton h-9 /> <Skeleton h-20 /> <Skeleton h-9 w-1/3 ml-auto />
//   </div>
```

> Примечание: `LowBalanceBanner` используется в `view-mode` (no-show) и
> `complete-mode` → выносим в `parts`, чтобы не дублировать и не плодить
> циклический импорт между режимами.

## `detail-inner.tsx` — загрузчик + switch + ленивые импорты

```ts
"use client";
import dynamic from "next/dynamic";
import { ViewMode } from "./view-mode";          // СТАТИЧНО — режим по умолчанию
import { LowBalanceBanner, ModeSkeleton, type Mode } from "./parts";

// ЛЕНИВО — грузятся только при переключении режима
const EditMode = dynamic(() => import("./edit-mode").then(m => m.EditMode),
  { loading: () => <ModeSkeleton /> });
const RescheduleMode = dynamic(() => import("./reschedule-mode").then(m => m.RescheduleMode),
  { loading: () => <ModeSkeleton /> });
const CompleteMode = dynamic(() => import("./complete-mode").then(m => m.CompleteMode),
  { loading: () => <ModeSkeleton /> });

export function LessonDetailInner({ lesson, studentName, onClose }): JSX.Element {
  // состояние/эффект загрузки detail — 1:1 со строками 105–139 оригинала:
  //   mode, detail, loading, loadError
  //   useEffect(() => loadLessonDetailAction(lesson.id) ... , [lesson.id])
  //   title по mode; notFound = !loading && !loadError && detail === null

  // рендер-ветвление 1:1 со строками 141–174:
  //   loadError → <ErrorState/>
  //   loading   → скелет деталей (как сейчас)
  //   notFound  → <ErrorState/>
  //   mode==="edit"       → <EditMode .../>        (теперь lazy)
  //   mode==="reschedule" → <RescheduleMode .../>  (теперь lazy)
  //   mode==="complete"   → <CompleteMode .../>    (теперь lazy)
  //   иначе               → <ViewMode .../>
}
```

**Ключевой момент:** `next/dynamic` внутри клиентского компонента создаёт
отдельный чанк, который грузится при первом рендере соответствующего режима.
`ssr: false` указывать **не нужно** — родитель уже клиентский, а контент и так
монтируется только при открытии модалки.

## Режимы — перенос без изменений логики

Каждый файл = `"use client"` + один экспорт, тело копируется 1:1 из оригинала,
меняются только импорты (общее берём из `./parts`, типы из `../actions`).

```ts
// view-mode.tsx    — ViewMode (строки 189–493) + локальный Row (178–185).
//   Импорт LowBalanceBanner из "./parts". Вся логика runScoped/runConfirmed/
//   scopePrompt/confirm/noShowBanner и футер по статусу — без изменений.

// edit-mode.tsx        — EditMode (495–546).      Экшен updateLessonCardAction.
// reschedule-mode.tsx  — RescheduleMode (548–629). Экшены update(Series|Lesson)Action.
// complete-mode.tsx    — CompleteMode (631–728).  Экшен completeLessonAction,
//                        импорт LowBalanceBanner из "./parts".
```

Типы `LessonFormState`, `CompleteLessonState`, `SeriesScope`, `SeriesTarget` и
все экшены продолжают импортироваться из `@/features/lessons/actions` — контракт
не трогаем.

## Пошаговый план миграции (механический, проверяемый)

1. Создать `lesson-detail/parts.tsx`: перенести `LowBalanceBanner`, типы `Mode`
   и `Confirmable`, добавить `ModeSkeleton`.
2. Создать `view-mode.tsx`: перенести `ViewMode` + `Row`, импортировать
   `LowBalanceBanner` из `./parts`. `pnpm typecheck`.
3. Создать `edit-mode.tsx`, `reschedule-mode.tsx`, `complete-mode.tsx`:
   перенести соответствующие функции. `pnpm typecheck` после каждого.
4. Создать `detail-inner.tsx`: перенести `LessonDetailInner`, статичный импорт
   `ViewMode`, ленивые `next/dynamic` для трёх форм.
5. Создать `dialog.tsx`: перенести `LessonDetailDialog`.
6. Превратить `lesson-detail-dialog.tsx` в barrel:
   `export { LessonDetailDialog } from "./lesson-detail/dialog";`
   (5 импортёров остаются нетронутыми).
7. Удалить мёртвый код из старого файла (теперь только re-export).
8. Прогнать `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
9. Сквозной Playwright-прогон по сценариям из phase 1 (особенно lazy-fallback и
   все статусы урока).

## Риски и на что смотреть

- **Циклические импорты**: `parts` не должен импортировать режимы; режимы
  импортируют только из `parts`/`actions`/общих ui — однонаправленно.
- **`onDone`/`onClose` идентичность ссылок**: в `Edit`/`Reschedule`/`Complete`
  есть `useEffect([state, onDone])`/`[state, onClose]` с закрытием по `state.ok`.
  Поведение сохраняется (колбэки те же), lazy-обёртка на это не влияет.
- **Fallback-высота**: `ModeSkeleton` подобрать по высоте ближе к форме, чтобы
  модалка не «прыгала» при подгрузке чанка.
- **Бандл-эффект** виден только в проде-сборке; в dev `next/dynamic` всё равно
  работает, но без визуального выигрыша размера.
