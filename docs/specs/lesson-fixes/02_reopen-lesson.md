# Псевдокод — C2: обратимое завершение (reopen)

Требования: §3 спеки. Сложность: средняя. Затрагивает БД (новая миграция), action, UI, i18n.
Зеркало `complete_lesson` (миграции 0001/0004): атомарно, идемпотентно, `SECURITY INVOKER`.

---

## Модуль 1 — миграция `supabase/migrations/0008_reopen_lesson.sql`

```sql
-- reopen_lesson: обратная к complete_lesson. Возвращает терминальный урок в
-- scheduled и отдаёт 1 занятие обратно в пакет. Атомарно и идемпотентно
-- (повторный вызов на не-терминальном уроке ничего не возвращает повторно).
-- SECURITY INVOKER (default) → RLS скоупит к владельцу.
create or replace function public.reopen_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
as $$
declare
  v_student_id uuid;
  v_status     text;
  v_pkg_id     uuid;
  v_left       integer;
begin
  -- RLS прячет чужие уроки → "не найден" = "не ваш".
  select student_id, status into v_student_id, v_status
  from public.lesson
  where id = p_lesson_id;

  if v_student_id is null then
    raise exception 'lesson_not_found';
  end if;

  -- Уже не терминальный → идемпотентный no-op, вернуть текущий баланс.
  if v_status not in ('done', 'no_show') then
    select coalesce(sum(lessons_left), 0) into v_left
    from public.package where student_id = v_student_id;
    return jsonb_build_object('lessons_left', v_left, 'reopened', false);
  end if;

  -- Вернуть урок в расписание (тему/заметку сохраняем — это черновик).
  update public.lesson set status = 'scheduled' where id = p_lesson_id;

  -- Вернуть 1 занятие в САМЫЙ СВЕЖИЙ пакет, где есть место (lessons_left < total).
  -- Это точная инверсия списания для частого случая одного пакета и никогда
  -- не превышает total_lessons. Нет пакета с местом → не добавляем (зеркалит
  -- завершение при 0, когда списания не было).
  select id into v_pkg_id
  from public.package
  where student_id = v_student_id and lessons_left < total_lessons
  order by created_at desc
  limit 1
  for update;

  if v_pkg_id is not null then
    update public.package set lessons_left = lessons_left + 1 where id = v_pkg_id;
  end if;

  select coalesce(sum(lessons_left), 0) into v_left
  from public.package where student_id = v_student_id;

  return jsonb_build_object('lessons_left', v_left, 'reopened', true);
end;
$$;
```

Заметки:

- Не трогаем `series_id`, `color`, `topic`, `note` — урок остаётся той же строкой.
- ДЗ, привязанное при завершении, остаётся (отдельная таблица) — это ожидаемо.
- Применение: удалённый проект → починить историю миграций → `pnpm dlx supabase db push`.
- После push обновить `src/lib/supabase/database.types.ts` (добавить сигнатуру RPC
  `reopen_lesson`) — иначе `supabase.rpc("reopen_lesson", …)` не типизируется.

---

## Модуль 2 — действие `reopenLessonAction` (`src/features/lessons/actions.ts`)

По образцу `markNoShowAction`.

```
FUNCTION reopenLessonAction(lessonId: string, studentId: string)
        RETURNS { ok?, error?, lessonsLeft? }:
    supabase = createClient()
    { data, error } = supabase.rpc("reopen_lesson", { p_lesson_id: lessonId })
    IF error: RETURN { error: error.message }
    revalidateLesson(studentId)
    RETURN { ok: true, lessonsLeft: (data as { lessons_left }).lessons_left }
```

Тип возврата можно переиспользовать `CompleteLessonState` (есть `ok/error/lessonsLeft`).

---

## Модуль 3 — UI `lesson-detail-dialog.tsx` (`ViewMode`)

Сейчас терминальная ветка (`else`) показывает только «Редактировать». Добавляем reopen через
существующий паттерн подтверждения `Confirmable`.

### Изменения типов/состояния

```
type Confirmable = "cancel" | "delete" | "noShow" | "reopen"   # + "reopen"
```

### runConfirmed — новая ветка

```
FUNCTION runConfirmed(kind):
    setError(null)
    startTransition(async ():
        TRY:
            SWITCH kind:
                CASE "cancel":  await cancelLessonAction(...);  onClose()
                CASE "delete":  await deleteLessonAction(...);  onClose()
                CASE "reopen":                                   # ← новое
                    res = await reopenLessonAction(lesson.id, lesson.student_id)
                    IF res.error: setError(res.error)
                    ELSE: onClose()                              # баланс вырос, баннер не нужен
                CASE "noShow":  ... (без изменений)
        CATCH e: setError(...)
    )
```

### confirmMessage — добавить ветку

```
confirmMessage =
    confirm == "cancel" ? t.lessons.cancelConfirm
  : confirm == "delete" ? t.lessons.deleteConfirm
  : confirm == "reopen" ? t.lessons.reopenConfirm        # ← новое
  : t.lessons.noShowConfirm
```

### Кнопка в терминальной ветке футера

```
# ... ветка `else` (status НЕ scheduled и НЕ canceled → значит done/no_show):
<DialogFooter>
    <Button variant="ghost" size="sm" onClick={() => setConfirm("reopen")}>
        <RotateCcw className="size-4" /> {t.lessons.reopen}
    </Button>
    <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="size-4" /> {t.lessons.edit}
    </Button>
</DialogFooter>
```

(иконку `RotateCcw` импортировать из `lucide-react`).

Подтверждение рендерится существующим блоком `confirm ? (...)`: для `reopen` кнопка
подтверждения — обычная (`variant="default"`), т.к. это не деструктив.

---

## Модуль 4 — i18n (`src/lib/i18n/ru.ts`, секция `lessons`)

```
reopen: "Вернуть в запланированные",
reopenConfirm: "Вернуть урок в расписание? Списанное занятие вернётся на баланс; выданная домашка останется.",
```

(добавить рядом с `complete`/`completeConfirm`).

---

## TDD-анкеры

Логика — в БД-функции; юнит-тестов vitest нет (нужен DB). Контракт + сквозной прогон.

```
# Контракт reopen_lesson (psql / будущий pgTAP):
TEST "reopen returns the burnt lesson to balance":
    GIVEN package(total=1, left=1); complete(L) ⇒ left=0
    WHEN  reopen_lesson(L)
    THEN  L.status=scheduled  AND  sum(left)=1  AND  reopened=true     # AC-C2-1

TEST "reopen is idempotent":
    GIVEN после предыдущего теста (L уже scheduled)
    WHEN  reopen_lesson(L)
    THEN  sum(left)=1  AND  reopened=false                              # AC-C2-2

TEST "reopen works for no_show":
    GIVEN package(1,1); markNoShow(L) ⇒ left=0
    WHEN  reopen_lesson(L)  THEN  left=1, status=scheduled              # AC-C2-3

TEST "reopen without packages":
    GIVEN ученик без пакетов; lesson done (списания не было)
    WHEN  reopen_lesson(L)  THEN  status=scheduled, balance=0, no error # AC-C2-4

TEST "reopen never exceeds total_lessons":
    GIVEN package(total=2, left=2) (полный)
    WHEN  reopen_lesson(L)  THEN  left остаётся 2 (нет места)           # EC-C2-3 / INV-C2-1

TEST "alternation has no drift (single package)":
    complete → reopen → complete  ⇒  balance как после одного complete  # INV-C2-2
```

Сквозной (ручной, в UI): завершить урок → открыть карточку → «Вернуть в запланированные» →
подтвердить → баланс восстановлен, урок снова в «Предстоящие», повторный reopen недоступен
(урок уже scheduled, кнопки нет).

## Чек реализации

- [ ] `0008_reopen_lesson.sql` создан и применён (`db push`).
- [ ] `database.types.ts` знает про `reopen_lesson`.
- [ ] `reopenLessonAction` добавлен.
- [ ] `Confirmable` + `runConfirmed` + `confirmMessage` + кнопка обновлены.
- [ ] i18n `reopen`/`reopenConfirm` добавлены.
- [ ] AC-C2-1…5 пройдены; `typecheck/lint/test/build` зелёные.
