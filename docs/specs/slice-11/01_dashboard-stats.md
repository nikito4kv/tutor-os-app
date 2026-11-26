# 01 — Динамический служебный дашборд

Расширяем `admin_stats()` новыми **агрегатами** и группируем дашборд в секции.
Граница ADR-0003 не двигается: только `COUNT`, ни одной строки наружу.

## Требования (функциональные)

1. **Дельты за 7 дней** к ключевым счётчикам: новые репетиторы и ученики за неделю
   (по `created_at`). Карточка показывает «всего · +N за неделю».
2. **Уроки по статусам** — `scheduled / done / canceled / no_show` (значения из
   `0001`+`0004`). Плюс пульс активности: проведено (`done`) за 7 дней.
3. **Сигналы активации/оттока** (всё ещё счётчики):
   - `tutors_no_students` — репетиторы без единого ученика (застряли на онбординге);
   - `tutors_inactive_30d` — репетиторы без уроков (`starts_at`) за 30 дней (отток).
4. Не-админ, дёрнувший RPC, получает `forbidden` (как сейчас).

> Деньги (MRR/выручка/активные пакеты) — **намеренно не здесь**. ADR-0003: добавляются
> позже отдельным ключом. Графиков нет — начинаем с чисел и дельт (анти-золочение).

## Данные — миграция `0013_admin_stats_v2.sql`

Расширяем `admin_stats()` (backward-compatible: старые 4 ключа сохраняются). Форма
плоская — как сейчас, чтобы маппинг карточек оставался простым.

```sql
-- псевдокод (точные имена/типы при реализации)
create or replace function public.admin_stats()
returns json language plpgsql security definer stable
set search_path = public as $$
declare d7  timestamptz := now() - interval '7 days';
        d30 timestamptz := now() - interval '30 days';
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return json_build_object(
    -- существующие (не трогаем имена)
    'tutors',        (select count(*) from public.tutor),
    'students',      (select count(*) from public.student),
    'lessons',       (select count(*) from public.lesson),
    'feedback_new',  (select count(*) from public.feedback where status = 'new'),
    -- дельты за 7 дней
    'tutors_new_7d',   (select count(*) from public.tutor   where created_at >= d7),
    'students_new_7d', (select count(*) from public.student where created_at >= d7),
    -- уроки по статусам (один проход через FILTER)
    'lessons_scheduled', (select count(*) from public.lesson where status = 'scheduled'),
    'lessons_done',      (select count(*) from public.lesson where status = 'done'),
    'lessons_canceled',  (select count(*) from public.lesson where status = 'canceled'),
    'lessons_no_show',   (select count(*) from public.lesson where status = 'no_show'),
    'lessons_done_7d',   (select count(*) from public.lesson
                            where status = 'done' and starts_at >= d7),
    -- активация / отток
    'tutors_no_students', (select count(*) from public.tutor t
                             where not exists (select 1 from public.student s
                                               where s.tutor_id = t.id)),
    'tutors_inactive_30d',(select count(*) from public.tutor t
                             where not exists (
                               select 1 from public.lesson l
                               join public.student s on s.id = l.student_id
                               where s.tutor_id = t.id and l.starts_at >= d30))
  );
end $$;

notify pgrst, 'reload schema';
```

> Заметка по `lessons_done_7d`: отдельной `completed_at` нет; «проведён на неделе»
> аппроксимируем как `status='done' AND starts_at >= d7`. Достаточно для пульса.
> Если `tutors_inactive_30d` окажется тяжёлым на больших объёмах — вынести в
> отдельный (по-прежнему gated) RPC; для текущих объёмов один `NOT EXISTS` норм.

`database.types.ts`: тип возврата `admin_stats` — ручной (как сейчас, `Json`),
форму фиксирует `AdminStats` в queries (ниже).

## Модули реализации (фиче-зона `features/admin`)

### `queries.ts` — расширить `AdminStats`

```ts
export interface AdminStats {
  tutors: number;
  students: number;
  lessons: number;
  feedback_new: number;
  tutors_new_7d: number;
  students_new_7d: number;
  lessons_scheduled: number;
  lessons_done: number;
  lessons_canceled: number;
  lessons_no_show: number;
  lessons_done_7d: number;
  tutors_no_students: number;
  tutors_inactive_30d: number;
}
// getAdminStats() не меняется по телу — та же RPC, расширенная форма.
```

### `admin-stats.ts` (новый, чистая логика → тестируемо)

```ts
// Метаданные секций/карточек: единый источник для рендера и тестов.
export const LESSON_STATUS_META = [
  { key: "lessons_scheduled", labelKey: "scheduled", icon: CalendarClock },
  { key: "lessons_done", labelKey: "done", icon: CheckCircle2 },
  { key: "lessons_canceled", labelKey: "canceled", icon: XCircle },
  { key: "lessons_no_show", labelKey: "no_show", icon: UserX },
] as const;

// Формат дельты для подписи карточки: 8 -> "+8", 0 -> null (ничего не рисуем).
export function formatDelta(n: number): string | null {
  return n > 0 ? `+${n}` : null;
}
```

### Компоненты

- `AdminStatsCards` (есть) — оставить как «KPI-ряд», но добавить дельту-подпись
  (`formatDelta(stats.tutors_new_7d)` под карточкой репетиторов/учеников).
- `LessonStatusCards` (новый) — ряд из 4 карточек по `LESSON_STATUS_META`.
- `HealthCards` (новый) — `tutors_no_students`, `tutors_inactive_30d`,
  `lessons_done_7d` (пульс). Подсветить ненулевой отток мягким `warning`-токеном.
- `admin/page.tsx` — три секции с заголовками (`t.admin.sections.*`): «Сводка»,
  «Уроки по статусам», «Активность». Каждая — `<section>` с подзаголовком.

> Все карточки — существующий `Card`, иконки lucide, числа `tabular-nums`, цвета —
> токены. Без новых зависимостей.

## i18n (`src/lib/i18n/ru.ts`, ветка `admin`)

```ts
admin: {
  ...,
  sections: { summary: "Сводка", lessons: "Уроки по статусам", activity: "Активность" },
  stats: {
    ...,
    tutorsDelta: "за неделю",          // подпись дельты
    studentsDelta: "за неделю",
    doneThisWeek: "Проведено за неделю",
    noStudents: "Репетиторы без учеников",
    inactive30d: "Без активности 30 дней",
  },
  lessonStatus: {
    scheduled: "Запланировано", done: "Проведено",
    canceled: "Отменено", no_show: "Не пришёл",
  },
}
```

## TDD-якоря (vitest, без БД)

`src/features/admin/admin-stats.test.ts`:

- `formatDelta(8) === "+8"`; `formatDelta(0) === null`; `formatDelta(-1) === null`.
- `LESSON_STATUS_META` покрывает ровно 4 статуса `lesson` (sync со схемой) и для
  каждого даёт ключ перевода из `t.admin.lessonStatus`.
- Тип `AdminStats` совместим с `json_build_object` (smoke: объект-литерал со всеми
  ключами компилируется).

Дашборд-SQL и `forbidden`-гейт — проверка через Supabase MCP (read-only) / ручной
сценарий: вход админом видит секции с числами; не-админ → RPC `forbidden`.

## Definition of Done (модуль)

- [ ] `0013` применена; `getAdminStats()` отдаёт расширенную форму; `AdminStats` обновлён.
- [ ] Три секции на `/admin`; дельты показываются только при `>0`.
- [ ] Не-админ → `forbidden`; построчного доступа к ученикам/урокам нет (только counts).
- [ ] light/dark, адаптив, фокус; строки `t.*`; цвета — токены; `any` нет.
- [ ] Unit-тесты `admin-stats.test.ts` зелёные.
