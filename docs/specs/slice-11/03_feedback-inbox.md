# 03 — Инбокс: фильтр по категории + счётчики

Добавляем второе измерение фильтра (категория) к существующему фильтру по статусу и
показываем счётчики на табах. Границы ADR-0003 не двигаются: админ уже читает строки
`feedback` по RLS; добавляются фильтр и агрегаты.

## Требования (функциональные)

1. Фильтр по **категории** `bug | idea | question | other` (значения из `0006`),
   рядом со статусным фильтром. Работают **одновременно** (статус И категория).
2. **Счётчики** на статусных табах: «Новые (5)», «Все (23)» и т.п.
3. URL отражает оба фильтра: `?status=new&category=bug`. Любое мусорное значение → `all`.
4. Пустой результат при активных фильтрах → `<EmptyState>` (свой текст «по фильтру
   ничего нет»).

> Поиск по тексту и счётчики «время до триажа» — **вне скоупа** (анти-золочение).

## Данные

Счётчики — агрегаты. Два пути; берём gated RPC (идиома проекта, как `admin_stats`):

`0013_admin_stats_v2.sql` (та же миграция, что и дашборд) — добавить:

```sql
create or replace function public.admin_feedback_counts()
returns json language plpgsql security definer stable
set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return json_build_object(
    'by_status', json_build_object(
      'all',    (select count(*) from public.feedback),
      'new',    (select count(*) from public.feedback where status = 'new'),
      'seen',   (select count(*) from public.feedback where status = 'seen'),
      'closed', (select count(*) from public.feedback where status = 'closed')
    ),
    'by_category', json_build_object(
      'all',      (select count(*) from public.feedback),
      'bug',      (select count(*) from public.feedback where category = 'bug'),
      'idea',     (select count(*) from public.feedback where category = 'idea'),
      'question', (select count(*) from public.feedback where category = 'question'),
      'other',    (select count(*) from public.feedback where category = 'other')
    )
  );
end $$;

notify pgrst, 'reload schema';
```

> Счётчики **глобальные** (не пересекаются с активным фильтром) — так таб «Новые (5)»
> всегда показывает реальное число новых. Это тоньше и предсказуемее, чем
> контекстные счётчики.

## Модули реализации (фиче-зона `features/admin`)

### `schema.ts` — добавить измерение категории

```ts
// зеркало FEEDBACK_FILTERS, но для категории
export const FEEDBACK_CATEGORIES = ["bug", "idea", "question", "other"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_CATEGORY_FILTERS = ["all", ...FEEDBACK_CATEGORIES] as const;
export type FeedbackCategoryFilter = (typeof FEEDBACK_CATEGORY_FILTERS)[number];

export function parseFeedbackCategory(value: string | undefined): FeedbackCategoryFilter {
  return (FEEDBACK_CATEGORY_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as FeedbackCategoryFilter)
    : "all";
}
```

> Категория уже имеет meta-мапу для бейджа (`feedback-category-badge.tsx`).
> Переиспользуем её подписи для фильтра-чипов.

### `queries.ts`

```ts
export interface FeedbackCounts {
  by_status: Record<FeedbackFilter, number>;
  by_category: Record<FeedbackCategoryFilter, number>;
}

export async function getFeedbackCounts(): Promise<FeedbackCounts> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_feedback_counts");
  if (error) throw new Error(error.message);
  return data as unknown as FeedbackCounts;
}

// listFeedback — добавить второй фильтр
export async function listFeedback(
  status: FeedbackFilter = "all",
  category: FeedbackCategoryFilter = "all",
): Promise<Feedback[]> {
  const supabase = await createClient();
  let query = supabase.from("feedback").select("*").order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (category !== "all") query = query.eq("category", category);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
```

### Компоненты

- `FeedbackFilterTabs` (есть) — принять `counts: FeedbackCounts["by_status"]`,
  дорисовать число в скобках; **сохранять `category` в href** при смене статуса
  (`?status=…&category=…`).
- `FeedbackCategoryFilter` (новый) — ряд чипов `all + 4 категории` со счётчиками;
  **сохранять `status`** в href. Стиль — как у статусных табов (или `Badge`-чипы).
- `feedback/page.tsx` — распарсить оба query-параметра, дёрнуть `listFeedback(status,
category)` и `getFeedbackCounts()` (параллельно `Promise.all`), прокинуть в табы.
  Пустой список под фильтром → `EmptyState` с `t.admin.feedback.emptyFiltered`.

## i18n (`ru.ts`, ветка `admin.feedback` — дополнить)

```ts
feedback: {
  ...,
  emptyFiltered: "По выбранному фильтру обращений нет.",
  categoryFilters: {
    all: "Все", bug: "Баги", idea: "Идеи", question: "Вопросы", other: "Другое",
  },
}
```

## TDD-якоря (vitest, без БД)

`src/features/admin/schema.test.ts` (дополнить):

- `parseFeedbackCategory("bug") === "bug"`; `parseFeedbackCategory(undefined) === "all"`;
  `parseFeedbackCategory("мусор") === "all"`.
- `FEEDBACK_CATEGORY_FILTERS` = `["all","bug","idea","question","other"]` (sync со схемой
  `0006`).
- meta-мапа категорий покрывает каждый enum-значение (подпись + вариант бейджа) —
  расширить существующий тест.

Счётчики/RPC и комбинированный фильтр — через Supabase MCP (read-only) / ручной
сценарий: `?status=new&category=bug` сужает список и сохраняется при переключении
второго измерения; не-админ → `forbidden`.

## Definition of Done (модуль)

- [ ] `0013` добавляет `admin_feedback_counts`; `database.types.ts` дополнен.
- [ ] Статус и категория фильтруют одновременно; URL держит оба; мусор → `all`.
- [ ] На статусных табах — счётчики; на категориях — счётчики.
- [ ] Пустой результат под фильтром → корректный `EmptyState`.
- [ ] Не-админ → `forbidden`; `feedback_insert` не затронут.
- [ ] light/dark, адаптив, фокус; строки `t.*`; цвета — токены; `any` нет.
- [ ] Unit-тесты схемы зелёные.
