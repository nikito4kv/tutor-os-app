# 03 — Фиче-зона `src/features/admin`

Копирует устройство эталона `features/students`: `schema.ts` (Zod) →
`queries.ts`/`actions.ts` (сервер) → компоненты. Бизнес-логика не в компонентах.

## `schema.ts` — чистые функции (TDD-якоря)

```ts
import { z } from "zod";

export const FEEDBACK_STATUSES = ["new", "seen", "closed"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

// Триаж: только статус.
export const feedbackStatusSchema = z.object({ status: z.enum(FEEDBACK_STATUSES) });

export function parseFeedbackStatusForm(formData: FormData) {
  return feedbackStatusSchema.safeParse({ status: formData.get("status") });
}

// Фильтр инбокса из ?status= (all | new | seen | closed).
export const FEEDBACK_FILTERS = ["all", ...FEEDBACK_STATUSES] as const;
export type FeedbackFilter = (typeof FEEDBACK_FILTERS)[number];

export function parseFeedbackFilter(value: string | undefined): FeedbackFilter {
  return (FEEDBACK_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as FeedbackFilter)
    : "all";
}
```

## `queries.ts` — чтение (RLS/RPC)

```ts
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { FeedbackFilter } from "./schema";

export type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export interface AdminStats {
  tutors: number;
  students: number;
  lessons: number;
  feedback_new: number;
}

/** Агрегаты дашборда. RPC сам гейтит по is_admin() и бросает forbidden не-админу. */
export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  if (error) throw new Error(error.message);
  return data as unknown as AdminStats; // RPC возвращает Json (как complete_lesson)
}

/** Список обращений новейшие сверху. RLS пускает админа (feedback_select_admin). */
export async function listFeedback(filter: FeedbackFilter = "all"): Promise<Feedback[]> {
  const supabase = await createClient();
  let query = supabase.from("feedback").select("*").order("created_at", { ascending: false });
  if (filter !== "all") query = query.eq("status", filter);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
```

## `actions.ts` — мутация (триаж статуса)

```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getIsAdmin } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { parseFeedbackStatusForm } from "./schema";

export interface FeedbackTriageState {
  error?: string;
  ok?: boolean;
}

export async function setFeedbackStatusAction(
  feedbackId: string,
  _prev: FeedbackTriageState,
  formData: FormData,
): Promise<FeedbackTriageState> {
  // Defense-in-depth поверх RLS (feedback_update_admin): дружелюбная ошибка вместо
  // молчаливого «0 строк обновлено».
  if (!(await getIsAdmin())) return { error: t.admin.forbidden };

  const parsed = parseFeedbackStatusForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ status: parsed.data.status })
    .eq("id", feedbackId);
  if (error) return { error: error.message };

  revalidatePath("/admin/feedback");
  revalidatePath("/admin"); // обновить счётчик feedback_new на дашборде
  return { ok: true };
}
```

## Компоненты (рисуют; логика — выше)

- **`admin-stats-cards.tsx`** (server) — принимает `AdminStats`, рендерит
  `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` карточек `Card`: число
  `text-2xl font-semibold`, подпись `text-xs text-muted-foreground`, lucide-иконка.
  Маппинг ключ→подпись через `t.admin.stats.*`.
- **`feedback-list.tsx`** (server) — `ul.divide-y.rounded-md.border`; в строке `li`
  (`flex items-start justify-between gap-3`):
  - `<FeedbackCategoryBadge category={f.category} />`;
  - `message` (`text-sm`, `max-w-prose`, перенос);
  - `contact` (если есть) + метка `f.tutor_id ? t.admin.feedback.registered : .anonymous`;
  - `page_url` (`text-xs text-muted-foreground`, обрезка), дата (`lib/date`);
  - справа `<FeedbackStatusSelect feedbackId={f.id} status={f.status} />`.
  - пустой список → `<EmptyState title={t.admin.feedback.empty} icon={…} />`.
- **`feedback-status-select.tsx`** (`"use client"`) — нативный `<select>` (классы как
  в `settings-form.tsx`), bound-экшен + авто-сабмит:
  ```tsx
  const action = setFeedbackStatusAction.bind(null, feedbackId);
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      <select
        name="status"
        defaultValue={status}
        disabled={pending}
        aria-label={t.admin.feedback.title}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="flex h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {FEEDBACK_STATUSES.map((s) => (
          <option key={s} value={s}>
            {t.admin.feedback.statuses[s]}
          </option>
        ))}
      </select>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
  ```
  Прогрессивное улучшение: без JS форма сабмитится сменой опции + (опц.) кнопкой.
- **`feedback-filter-tabs.tsx`** — ссылки `?status=` (паттерн табов students:
  активная `border-primary text-foreground`; контейнер `overflow-x-auto`,
  элементы `whitespace-nowrap`; `focusRing` из `lib/styles`). Подписи `t.admin.feedback.filters.*`.
- **`feedback-category-badge.tsx`** — мапа `category → Badge variant`
  (`bug→destructive`, `idea→success`, `question→secondary`, `other→outline`);
  подписи берём из `t.support.categories` (массив `{value,label}`), не дублируем.

## TDD-якоря — `src/features/admin/schema.test.ts` (vitest, без БД)

```ts
import { describe, expect, it } from "vitest";
import { parseFeedbackFilter, parseFeedbackStatusForm, FEEDBACK_STATUSES } from "./schema";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseFeedbackFilter", () => {
  it("passes through a valid status", () => {
    expect(parseFeedbackFilter("new")).toBe("new");
    expect(parseFeedbackFilter("closed")).toBe("closed");
  });
  it("falls back to 'all' on missing/garbage", () => {
    expect(parseFeedbackFilter(undefined)).toBe("all");
    expect(parseFeedbackFilter("nope")).toBe("all");
  });
});

describe("parseFeedbackStatusForm", () => {
  it("accepts each known status", () => {
    for (const s of FEEDBACK_STATUSES)
      expect(parseFeedbackStatusForm(form({ status: s })).success).toBe(true);
  });
  it("rejects empty / unknown status", () => {
    expect(parseFeedbackStatusForm(form({})).success).toBe(false);
    expect(parseFeedbackStatusForm(form({ status: "spam" })).success).toBe(false);
  });
});
```

Если выделим meta-мапу статуса/категории в чистую функцию — добавить тест
«каждое значение enum имеет подпись и Badge-вариант».

→ Маршруты, сайдбар, i18n: [`04_ui-i18n.md`](04_ui-i18n.md).
