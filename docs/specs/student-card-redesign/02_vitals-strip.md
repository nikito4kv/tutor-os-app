# Псевдокод — V: витальная полоса (баланс-герой + инлайн «Пополнить»)

Требования: §4 спеки. Сложность: низкая. Рестайл balance-card в полосу + один опциональный
проп у `AddPackage`. Самый дешёвый шаг — делаем первым.

---

## Модуль 1 — опциональный `trigger` у `src/features/packages/add-package.tsx`

Зеркалит существующий паттерн `EditStudentDialog` (`trigger?: ReactNode`). Поведение по
умолчанию (без `trigger`) не меняется — все текущие места рендерят прежнюю кнопку «+ пакет».

```
FUNCTION AddPackage({ studentId, trigger }: { studentId: string; trigger?: ReactNode }):
    ... (state, formAction, open — без изменений) ...
    RETURN (
      <FormDialog
        open={open} onOpenChange={setOpen} title={t.packages.add}
        trigger={ trigger ?? (
          <Button size="sm"><Plus className="size-4" />{t.packages.add}</Button>
        )}
      >
        ... форма без изменений ...
      </FormDialog>
    )
```

---

## Модуль 2 — компонент `src/features/students/student-vitals.tsx` (новый)

Серверный компонент (без клиентского состояния), рендерит баланс-герой и — при низком балансе —
инлайн `AddPackage` с собственным триггером «Пополнить».

```
IMPORT { Card, CardContent } from "@/components/ui/card"
IMPORT { Badge } from "@/components/ui/badge"
IMPORT { Button } from "@/components/ui/button"
IMPORT { AddPackage } from "@/features/packages/add-package"
IMPORT { Wallet } from "lucide-react"
IMPORT { cn } from "@/lib/utils"
IMPORT { t } from "@/lib/i18n"

FUNCTION StudentVitals({ studentId, lessonsLeft, lowBalance }):
    RETURN (
      <Card className={cn(lowBalance && "border-warning/40 bg-warning/5")}>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex items-baseline gap-3">
            <span className={cn("text-3xl font-semibold", lowBalance && "text-warning")}>
              {lessonsLeft}
            </span>
            <span className="text-sm text-muted-foreground">{t.students.lessonsLeft}</span>
            {lowBalance ? <Badge variant="warning">{t.students.lowBalance}</Badge> : null}
          </div>
          {lowBalance ? (
            <AddPackage
              studentId={studentId}
              trigger={
                <Button size="sm" variant="outline">
                  <Wallet className="size-4" />
                  {t.students.topUp}
                </Button>
              }
            />
          ) : null}
        </CardContent>
      </Card>
    )
```

Заметки:

- Горизонтальная полоса (`flex justify-between`), а не вертикальная карточка — экономит высоту
  на мобильном и читается как «командная строка» (FR-V-1).
- Тинт низкого баланса — мягкая заливка токеном (`bg-warning/5`, `border-warning/40`,
  `text-warning`) по `docs/DESIGN.md` §2; сырых цветов нет (INV-X3).
- `flex-wrap` → на 375px кнопка «Пополнить» переносится под число (EC-V-4 / AC-V-5).
- Цвет не единственный сигнал: при низком балансе есть и бейдж-текст, и кнопка (§9).

---

## Модуль 3 — встраивание в `src/app/(app)/students/[id]/page.tsx`

Удаляем блок «Balance summary» (`<Card>` с балансом) и ставим полосу. `lessonsLeft`/`lowBalance`
уже вычислены выше по файлу — новых запросов нет (FR-V-3).

```
# было: <Card>…CardHeader "Баланс занятий"…CardContent {lessonsLeft}…</Card>
# стало:
<StudentVitals studentId={id} lessonsLeft={lessonsLeft} lowBalance={lowBalance} />
```

Импорт `Card/CardContent/CardHeader/CardTitle/Progress/Badge` в `page.tsx`: после переноса
проверить, какие из них ещё используются (Progress/Badge — да, в табах). Лишние импорты убрать
(ESLint `no-unused-vars`).

---

## Модуль 4 — i18n (`src/lib/i18n/ru.ts`, секция `students`)

```
topUp: "Пополнить",
```

(`balance`, `lessonsLeft`, `lowBalance` — уже есть, переиспользуем.)

---

## TDD-анкеры

Чистой логики нет (рендер + опциональный проп) → юнит-тестов не добавляем. Проверка — ручная по
критериям приёмки §4.

## Чек реализации

- [ ] `trigger?` у `AddPackage`; дефолт (без пропа) не изменился — текущие места рендерят как раньше.
- [ ] `student-vitals.tsx`: герой-число + бейдж/кнопка только при `lowBalance`.
- [ ] `page.tsx`: balance-Card → `<StudentVitals/>`; неиспользуемые импорты убраны.
- [ ] i18n `students.topUp`.
- [ ] AC-V-1: при низком балансе «Пополнить» открывает `AddPackage` (модалка §7).
- [ ] AC-V-2: здоровый баланс — без кнопки/бейджа.
- [ ] AC-V-3: полоса на всех 4 вкладках; non-overview без новых запросов.
- [ ] AC-V-4/V-5: светлая+тёмная тема, 375px без горизонтального скролла.
