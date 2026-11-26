# Псевдокод — H: шапка и пустые состояния-CTA

Требования: §5 спеки. Сложность: средняя — аккуратно с фокусом Radix (Dialog из пункта меню).
Меняем приоритет действий шапки и убираем мёртвый текст у пустого next-lesson.

---

## Модуль 1 — primary-действие шапки `src/app/(app)/students/[id]/page.tsx`

Сейчас в правом кластере: `<EditStudentDialog/>` (outline «Редактировать») + `<StudentActionsMenu/>`.
Меняем на: частотное `AddLesson` (primary) + `<StudentActionsMenu/>` (теперь и с «Редактировать»).

```
# было:
<div className="flex flex-wrap items-center gap-2">
  <EditStudentDialog student={student} />
  <StudentActionsMenu shareUrl={shareUrl} deleteAction={…} />
</div>

# стало:
<div className="flex flex-wrap items-center gap-2">
  <AddLesson studentId={id} lessonsLeft={lessonsLeft} />     {/* primary, FR-H-1 */}
  <StudentActionsMenu student={student} shareUrl={shareUrl} deleteAction={…} />
</div>
```

Заметки:

- `AddLesson` без `lastLessonAt` → дефолт даты «завтра» (`defaultStartDate`, EC-H-2). Хинт
  баланса показывается из `lessonsLeft` (он уже есть в `page.tsx`).
- `AddLesson` рендерит свою кнопку «+ Добавить урок» (`size="sm"`); отдельный `trigger` не нужен.
- `EditStudentDialog` из шапки убирается (переезжает в меню, Модуль 3).

---

## Модуль 2 — контролируемый режим `src/features/students/student-dialogs.tsx`

`EditStudentDialog` должен уметь открываться извне (из пункта меню), сохраняя самоуправляемый
режим для «+ добавить контакт» (`student-overview.tsx`, INV-H-2).

```
FUNCTION EditStudentDialog({
    student,
    trigger,
    open: controlledOpen,        # ← новые опциональные
    onOpenChange,                # ←
}: {
    student: Student
    trigger?: ReactNode
    open?: boolean
    onOpenChange?: (open: boolean) => void
}):
    [uncontrolledOpen, setUncontrolledOpen] = useState(false)
    isControlled = controlledOpen !== undefined
    open = isControlled ? controlledOpen : uncontrolledOpen
    setOpen = isControlled ? (onOpenChange ?? noop) : setUncontrolledOpen

    action = updateStudentAction.bind(null, student.id)
    RETURN (
      <FormDialog
        open={open} onOpenChange={setOpen} title={t.students.editStudent}
        trigger={ isControlled
          ? null                                  # триггером управляет родитель (пункт меню)
          : (trigger ?? <Button variant="outline" size="sm"><Pencil/>{t.common.edit}</Button>) }
      >
        <StudentForm action={action} student={student} />
      </FormDialog>
    )
```

Заметки:

- `DialogTrigger asChild` в `FormDialog` принимает `null` как `trigger` → видимого триггера нет,
  открытие — только через `open`. (Если `asChild` с `null` капризничает — рендерить
  `<span className="hidden" />` как заглушку; решаем при импле.)
- В контролируемом режиме `onOpenChange` обязателен для закрытия по ESC/оверлею (Radix зовёт
  его) — родитель хранит состояние.

---

## Модуль 3 — пункт «Редактировать» в `src/features/students/student-actions-menu.tsx`

Ключевой момент — **не вкладывать** `Dialog` в `DropdownMenuItem` (конфликт фокуса Radix).
Паттерн: пункт меню переключает внешний `open`; `EditStudentDialog` — сиблинг меню,
контролируемый (FR-H-3, EC-H-1).

```
IMPORT { Pencil } from "lucide-react"
IMPORT { EditStudentDialog } from "./student-dialogs"
IMPORT type { Student } from "./queries"

FUNCTION StudentActionsMenu({ student, shareUrl, deleteAction }):
    [copied, setCopied] = useState(false)
    [pending, startTransition] = useTransition()
    [editOpen, setEditOpen] = useState(false)        # ← внешнее состояние модалки

    ... copy()/onDelete() без изменений ...

    RETURN (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t.students.actionsMenu} disabled={pending}>
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setEditOpen(true) }}>
              <Pencil />{t.common.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); void copy() }}>
              {copied ? <Check /> : <Copy />}{t.students.copyLink}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} disabled={pending}
                              className="text-destructive focus:text-destructive">
              <Trash2 />{t.common.delete}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Сиблинг меню — контролируемый, без своего триггера */}
        <EditStudentDialog student={student} open={editOpen} onOpenChange={setEditOpen} />
      </>
    )
```

Заметки:

- `onSelect` с `e.preventDefault()` для «Редактировать» — меню закрывается, фокус уходит в
  модалку (Radix корректно отрабатывает, т.к. Dialog — сиблинг, не потомок item).
- Деструктив остаётся отделён (`DropdownMenuSeparator` + `text-destructive`) и под `confirm`
  (INV-H-1).
- Сигнатура меню расширяется пропом `student` — это единственное место вызова (`page.tsx`).

---

## Модуль 4 — CTA у пустого next-lesson `src/features/students/student-overview.tsx`

Мёртвый текст «Урок не запланирован» → действие «Запланировать» (`AddLesson`). next-lesson при
этом повышается в самостоятельную карточку (см. также L) — здесь правим только пустую ветку.

```
# в карточке next-lesson, ветка "нет урока":
# было: <p className="text-sm text-muted-foreground">{t.students.overview.noNextLesson}</p>
# стало:
<div className="space-y-2">
  <p className="text-sm text-muted-foreground">{t.students.overview.noNextLesson}</p>
  <AddLesson studentId={studentId} lessonsLeft={lessonsLeft} />
</div>
```

Заметки:

- `lessonsLeft` прокидывается в `StudentOverview` (см. `01_*` Модуль 3 и L).
- Пустые состояния списков (lessons/packages/payments/homework) уже имеют «Добавить…» в шапке
  секции рядом (FR-H-5) → отдельный CTA в `EmptyState` опционален; если добавляем — через проп
  `action` (`EmptyState` его поддерживает), не ломая §8.

---

## TDD-анкеры

Чистой логики нет. Проверка — ручная по §5 (особое внимание EC-H-1: фокус и закрытие модалки
из меню; AC-H-4: регресс «+ добавить контакт»).

## Чек реализации

- [ ] Шапка: `AddLesson` primary перед «···»; `EditStudentDialog` из шапки убран (AC-H-1).
- [ ] `EditStudentDialog` — опциональный контролируемый режим; самоуправление сохранено (INV-H-2).
- [ ] `StudentActionsMenu`: пункт «Редактировать» + контролируемый диалог-сиблинг (AC-H-2).
- [ ] Пустой next-lesson → CTA «Запланировать» (AC-H-3).
- [ ] EC-H-1: меню закрывается, модалка фокусируется, ESC/оверлей закрывают.
- [ ] AC-H-4: «+ добавить контакт» в обзоре по-прежнему открывает редактирование.
- [ ] AC-H-5: 375px без горизонтального скролла.
