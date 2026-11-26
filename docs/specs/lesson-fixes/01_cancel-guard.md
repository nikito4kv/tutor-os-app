# Псевдокод — C1: гард отмены урока

Файл: `src/features/lessons/actions.ts` → `cancelLessonAction`.
Требования: §2 спеки (`00_specification.md`). Сложность: низкая, без миграции.

## Текущее (баг)

```
FUNCTION cancelLessonAction(lessonId, studentId):
    supabase = createClient()
    error = supabase.from("lesson")
                    .update({ status: "canceled" })
                    .eq("id", lessonId)          # ← нет фильтра по статусу
    IF error: THROW error
    revalidateLesson(studentId)
```

## Целевое

```
FUNCTION cancelLessonAction(lessonId, studentId):
    supabase = createClient()
    # Отменять можно только запланированный урок. Терминальные (done/no_show)
    # уже списали баланс — их нельзя «спрятать» в canceled без возврата.
    # Это зеркалит гард в deleteLessonAction/updateLessonAction.
    error = supabase.from("lesson")
                    .update({ status: "canceled" })
                    .eq("id", lessonId)
                    .in("status", ["scheduled"])   # ← добавлено
    IF error: THROW error
    revalidateLesson(studentId)
```

Заметки:

- Если урок терминальный → 0 строк затронуто → тихий no-op (не ошибка). Так же ведёт себя
  `deleteLessonAction`, когда статус не подходит.
- `cancelSeriesAction` НЕ трогаем — там уже `.eq("status", "scheduled")` в `collectSeriesIds`
  и при апдейте.
- UI (`ViewMode`) показывает «Отменить» только для `scheduled` — регресс не вносим.

## TDD-анкеры

Прямой юнит-тест по Supabase невозможен (нужен мок-цепочки/DB). Проверяем контрактом и вручную:

```
# Контракт (ручной psql / интеграционный):
TEST "cancel keeps a done lesson intact":
    GIVEN lesson L status=done, баланс ученика B
    WHEN  cancelLessonAction(L)
    THEN  L.status == done  AND  баланс == B            # AC-C1-1

TEST "cancel moves a scheduled lesson to canceled":
    GIVEN lesson L status=scheduled
    WHEN  cancelLessonAction(L)
    THEN  L.status == canceled                          # AC-C1-2
```

Опционально (если захотим юнит): вынести построитель запроса не нужно — изменение
тривиально, покрывается сквозным прогоном AC-C1-3 (кнопка видна только для scheduled).

## Чек реализации

- [ ] Добавлен `.in("status", ["scheduled"])`.
- [ ] `pnpm typecheck && pnpm lint` зелёные.
- [ ] Ручной AC-C1-1/2/3.
