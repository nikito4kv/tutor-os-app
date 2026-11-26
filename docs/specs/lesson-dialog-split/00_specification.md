# Спецификация — разбить `lesson-detail-dialog.tsx` на модули + ленивые режимы

Фаза **S** (Specification) SPARC: требования, инварианты и критерии приёмки.
Псевдокод и план миграции — в [`01_pseudocode.md`](01_pseudocode.md).

## Контекст и цель

`src/features/lessons/lesson-detail-dialog.tsx` — **729 строк**, один файл с
`"use client"`, в котором живут 4 режима модалки урока. Это нарушает правило
правила проекта «файлы и функции небольшие, один модуль — одна ответственность»
и грузит в клиентский бандл код всех режимов сразу, хотя при открытии модалки
показывается только режим **view**.

**Цель:** разбить файл на модули по ответственности и **лениво** подгружать
тяжёлые режимы (`edit` / `reschedule` / `complete`), оставив `view` в основном
чанке. Поведение, тексты и контракты server actions **не меняются**.

Это **рефакторинг**, а не фича. Скоуп режем агрессивно: никакого нового
функционала, никаких изменений в `actions.ts` / `queries.ts` / `schema.ts`.

## Текущая структура (as-is)

Один файл содержит (строки — на момент написания спеки):

| Символ                     | Строки  | Роль                                                             | `"use client"` нужен? |
| -------------------------- | ------- | ---------------------------------------------------------------- | --------------------- |
| `LowBalanceBanner`         | 52–61   | helper-баннер, шарят `view`(no-show) и `complete`                | нет (чистый JSX)      |
| `LessonDetailDialog`       | 69–94   | **публичный экспорт**: триггер + `Dialog`-оболочка, `open` state | да                    |
| `LessonDetailInner`        | 96–176  | грузит `LessonDetail`, переключает `mode`                        | да                    |
| `Row`                      | 178–185 | helper строки «лейбл/значение», только `view`                    | нет                   |
| `ViewMode`                 | 189–493 | детали + ДЗ + подтверждения + scope-промпты + футер действий     | да                    |
| `EditMode`                 | 495–546 | форма правки темы/заметки/цвета                                  | да                    |
| `RescheduleMode`           | 548–629 | форма переноса + scope для серий                                 | да                    |
| `CompleteMode`             | 631–728 | форма завершения + опц. выдача ДЗ                                | да                    |
| типы `Mode`, `Confirmable` | 49, 187 | локальные типы                                                   | —                     |

### Внешние зависимости режимов (что тянется в чанк)

- `EditMode` → `ColorPicker`, `updateLessonCardAction`.
- `RescheduleMode` → `LessonDateTimeRangeField` (тянет `date-field`, календарь,
  `date-fns`), `updateSeriesAction` / `updateLessonAction`.
- `CompleteMode` → `HomeworkFileField` (аплоад файлов), `HomeworkStatusBadge`,
  `completeLessonAction`.
- `ViewMode` → много действий-actions, `LessonStatusBadge`, `HomeworkStatusBadge`.

Именно `reschedule` и `complete` тянут самые тяжёлые поддеревья (поля
дата/время и аплоад). Их и выгодно отложить.

### Кто импортирует публичный API (blast radius)

`LessonDetailDialog` импортируют 5 файлов:

- `src/features/dashboard/next-lesson-card.tsx`
- `src/features/dashboard/action-inbox.tsx`
- `src/features/students/student-overview.tsx`
- `src/features/lessons/week-calendar.tsx`
- `src/features/lessons/lesson-list.tsx`

→ Публичный путь импорта **`@/features/lessons/lesson-detail-dialog`** и имя
`LessonDetailDialog` **должны остаться валидными**, чтобы не трогать 5 файлов.

## Проблема (что именно оптимизируем)

1. **Размер файла** — 729 строк против правила «маленькие модули».
2. **Клиентский бандл** — открытие модалки (обычно только просмотр) тянет JS
   всех форм. После сплита `edit`/`reschedule`/`complete` грузятся по требованию.
3. **Поддерживаемость** — 4 режима в одном файле трудно ревьюить и тестировать.

## Инварианты (что НЕЛЬЗЯ сломать)

- **Поведение каждого режима 1:1**, включая:
  - загрузку деталей через `loadLessonDetailAction` с состояниями
    loading / error / notFound;
  - перезапуск формы при каждом открытии (контент монтируется только при `open`);
  - inline-обработку ошибок в `ViewMode` (`runScoped`/`runConfirmed` ловят throw,
    не дают долететь до route error boundary);
  - low-balance-баннер после no-show и после complete;
  - scope-промпты (`one`/`future`/`all`) для серий в cancel/delete и reschedule;
  - набор кнопок футера по `lesson.status` (`scheduled` / `canceled` / прочее).
- **Контракты server actions** и их импорты — без изменений.
- **Тексты** — только через `t.*` (никаких новых хардкод-строк).
- **Доступность и стили** — классы, `min-h-11`, focus-ring сохранены как есть.
- Публичный импорт-путь и имя экспорта — без изменений (см. blast radius).

## Нефункциональные требования

- TypeScript strict, **без `any`** (тип `LessonFormState` и пр. переиспользуем).
- Каждый новый модуль **< 200 строк** (с запасом к лимиту 500 из инструкции).
- Только Tailwind + shadcn/ui, бренд-токен не трогаем (правила проекта).
- `typecheck`, `lint`, `test`, `build` — зелёные (правила проекта).

## Критерии приёмки (Definition of Done)

- [ ] `lesson-detail-dialog.tsx` стал тонким (re-export или оболочка), каждый
      режим — в своём файле; ни один файл зоны не превышает ~200 строк.
- [ ] `edit` / `reschedule` / `complete` грузятся через `next/dynamic`
      (отдельные чанки), `view` — в основном чанке.
- [ ] При переключении режима показывается скелет-fallback, без «прыжка» layout.
- [ ] Все 5 импортёров работают без правок (или правки сведены к одному barrel).
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` зелёные.
- [ ] Сквозной прогон в браузере (см. TDD-якоря) проходит для всех статусов.

## TDD-якоря / план проверки

Логика тут UI-шная и завязана на server actions — основная проверка **e2e
(Playwright)**, юнит-тестов на чистую логику здесь почти нет (она уже в
`recurrence.test.ts` и не затрагивается).

Сценарии для ручного/Playwright прогона (по `docs/DESIGN.md` состояния обязательны):

1. **Открытие** урока в статусе `scheduled` → виден `view`, корректный футер
   (delete / cancel / no-show / edit / reschedule / complete).
2. **Edit** → меняем тему/заметку/цвет → save → модалка закрывается, данные
   обновились (revalidate `/schedule` + `/students/:id`).
3. **Reschedule** одиночного урока и **серии** (scope `one`/`future`/`all`).
4. **Complete** без ДЗ и с ДЗ (чекбокс → поля → файл). Проверить low-balance
   баннер при балансе ≤ 0.
5. **No-show** → low-balance баннер при просадке баланса.
6. **Cancel / Delete** одиночного и серии (scope-промпт).
7. **Reopen** для завершённого урока.
8. **Состояния загрузки**: скелет деталей, `loadError` (`ErrorState`),
   `notFound`.
9. **Lazy-fallback**: при первом переключении в `edit`/`reschedule`/`complete`
   виден короткий скелет, затем форма; layout не «прыгает».

Регресс-чек бандла (необязательный, но желательный): сравнить размер клиентского
чанка модалки до/после (`pnpm build` → размер чанка с `LessonDetailInner`).

## Вне скоупа

- Любые изменения логики actions, валидации, RLS, миграций.
- Новые поля/режимы модалки.
- Изменение визуала (это рефактор, не редизайн — `docs/DESIGN.md` не трогаем).

→ Псевдокод и план миграции: [`01_pseudocode.md`](01_pseudocode.md).
