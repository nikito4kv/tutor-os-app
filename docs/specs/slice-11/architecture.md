# Архитектура — срез 11

Фаза **A** (Architecture) SPARC. Связывает три модуля спеки
([00](00_specification.md)–[03](03_feedback-inbox.md)) в системный вид: слои, контракты
на швах, поток данных, безопасность, карта изменений по файлам, порядок сборки.

Не вводит новых решений уровня ADR (см. [00 §«Связь с ADR-0003»](00_specification.md)).
Наследует законы проекта: бизнес-логика в `queries.ts`/`actions.ts`; Supabase только
через `lib/supabase/*`; источник схемы — `supabase/migrations/`; UI — `t.*` + токены.

## 1. Системный вид (как срез ложится на слои)

```
                 БРАУЗЕР                         СЕРВЕР (Next App Router)                 SUPABASE
 ┌───────────────────────────┐   ┌──────────────────────────────────────────┐   ┌──────────────────┐
 │ (admin)/admin             │   │ page (RSC, force-dynamic)                  │   │ RPC admin_stats() │
 │   ├ AdminStatsCards       │◀──┤   getAdminStats() ──────────────────────────┼──▶│  (SECURITY DEF +  │ M1
 │   ├ LessonStatusCards (n) │   │                                            │   │   is_admin gate)  │
 │   └ HealthCards (n)       │   │                                            │   └──────────────────┘
 ├───────────────────────────┤   ├────────────────────────────────────────────┤  ┌──────────────────┐
 │ (admin)/admin/feedback    │   │ page: Promise.all(                         │   │ RLS feedback_*    │
 │   ├ FeedbackFilterTabs    │◀──┤   listFeedback(status,category),           ├──▶│ RPC admin_        │ M3
 │   ├ FeedbackCategory (n)  │   │   getFeedbackCounts() )                     │   │  feedback_counts()│
 │   └ FeedbackList          │   │                                            │   └──────────────────┘
 ├───────────────────────────┤   ├────────────────────────────────────────────┤  ┌──────────────────┐
 │ (auth)/forgot-password (n)│   │ requestPasswordResetAction ────────────────┼──▶│ auth.resetPassword│
 │ (auth)/reset-password  (n)│   │ updatePasswordAction ──────────────────────┼──▶│ auth.updateUser   │ M2
 │   └ links from AuthForm   │   │ /auth/callback route ── exchangeCodeForSession │ │ (PKCE recovery)   │
 └───────────────────────────┘   └────────────────────────────────────────────┘  └──────────────────┘
                                      (n) = новый артефакт                  M1/M2/M3 = модули спеки
```

Все три модуля — один и тот же конвейер проекта: **RSC-страница → серверная
функция зоны → `lib/supabase/*` → БД (gated RPC / RLS)**. Клиентские компоненты
только рисуют и держат URL-состояние; мутации идут через server actions.

## 2. Контракты на швах (то, что фиксирует архитектура)

### M1 — дашборд

| Шов               | Контракт                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| DB → query        | `admin_stats() returns json`, расширенная **плоская** форма (см. [01](01_dashboard-stats.md)); старые 4 ключа неизменны |
| query → page      | `getAdminStats(): Promise<AdminStats>` (тело не меняется; меняется только тип)                                          |
| page → компоненты | `AdminStats` дробится на 3 props-группы: KPI (+дельты), lesson-by-status, health                                        |
| чистая логика     | `admin-stats.ts`: `formatDelta(n)`, `LESSON_STATUS_META` — единый источник для рендера и тестов                         |

### M2 — восстановление пароля

| Шов                     | Контракт                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| page → action           | `requestPasswordResetAction(prev, FormData): Promise<AuthState>` — **всегда** `{message}` (anti-enumeration)                          |
| email-ссылка → callback | `GET /auth/callback?code&next` → `exchangeCodeForSession` → `redirect(safeRedirect(next))`                                            |
| page → action           | `updatePasswordAction(prev, FormData): Promise<AuthState>` — требует recovery-сессию (`getUser()`), иначе `{error: resetLinkInvalid}` |
| схемы                   | `forgotPasswordSchema`, `resetPasswordSchema` переиспользуют `email` и `signUpPassword`                                               |
| `redirectTo`            | строится из `env.appUrl`, **не** из заголовков запроса                                                                                |

`AuthState` (существующий `{error?, message?, fieldErrors?}`) — переиспользуется без
изменений: новые actions совместимы с `useActionState`, как `signInAction`.

### M3 — инбокс

| Шов           | Контракт                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------- |
| DB → query    | `admin_feedback_counts() returns json` → `{by_status, by_category}` (глобальные counts)                               |
| query → page  | `listFeedback(status, category)` (второй параметр, дефолт `"all"`); `getFeedbackCounts(): Promise<FeedbackCounts>`    |
| URL-состояние | `?status=&category=` — двумерное; парсеры `parseFeedbackFilter` / `parseFeedbackCategory` нормализуют мусор → `"all"` |
| табы          | каждый таб сохраняет **другое** измерение в href (status-таб не теряет category и наоборот)                           |

## 3. Поток восстановления пароля (PKCE) — последовательность

```
Пользователь        /forgot-password        Supabase Auth        Почта        /auth/callback        /reset-password
    │  email ───────────▶│                       │                 │                │                     │
    │                    │ resetPasswordForEmail  │                 │                │                     │
    │                    │ (redirectTo=appUrl ────▶│                 │                │                     │
    │                    │  /auth/callback)       │ ─ письмо ──────▶│                │                     │
    │ ◀── "если email есть, ссылка отправлена" (нейтрально, всегда) │                │                     │
    │  клик по ссылке (?code=…) ─────────────────────────────────────────────────▶│                     │
    │                    │                       │ exchangeCodeForSession(code)      │ recovery-сессия ──▶ │
    │                    │                       │                 │                │  redirect(next)     │
    │  новый пароль ──────────────────────────────────────────────────────────────────────────────────▶│
    │                    │                       │ updateUser({password})           │                     │
    │ ◀── redirect /students (вошёл)                                                                       │
```

Граничные случаи: нет `code` → callback редиректит на `/reset-password` без сессии →
страница показывает `resetLinkInvalid`. Истёкший `code` → `exchangeCodeForSession`
не ставит сессию → тот же `resetLinkInvalid`.

## 4. Архитектура UI (компонентные решения)

- **M2 — отдельные тонкие формы, не 4-й режим `AuthForm`.** `AuthForm` сейчас
  жёстко `signin|signup` с зеркалами пароля/совпадения. Расширять его до 4 режимов
  раздуло бы один компонент (против «одна ответственность»). Решение: два новых
  client-компонента в `features/auth`, переиспользующих примитивы:
  - `ForgotPasswordForm` → `TextField` (email) + `requestPasswordResetAction`;
  - `ResetPasswordForm` → `PasswordField` + `PasswordStrength` + `updatePasswordAction`.
    Бренд-каркас даёт `(auth)/layout.tsx` бесплатно → страницы тонкие (как `login`).
    В `AuthForm` (режим `signin`) добавляется ссылка `t.auth.forgotLink` → `/forgot-password`.
- **M1 — три секции вместо одного грида.** `AdminStatsCards` остаётся KPI-рядом
  (+подпись дельты), добавляются `LessonStatusCards` и `HealthCards`. Все на
  существующем `Card`, иконки lucide, `tabular-nums`. Без charting-либы.
- **M3 — симметрия фильтров.** `FeedbackCategoryFilter` строится по образцу
  `FeedbackFilterTabs` (тот же таб-стиль, `focusRing`), оба принимают counts.

## 5. Данные — миграции `0013` (M1) и `0014` (M3)

- **M1 → `0013_admin_stats_v2.sql`**: `create or replace function admin_stats()`
  (расширение). **M3 → отдельная миграция `0014`**: `admin_feedback_counts()` — её не
  заводим заранее, чтобы не держать неиспользуемую функцию в БД (анти-золочение). M2
  миграцию **не трогает** (auth-флоу без схемы).
  > Уточнение к фазе A: исходно планировалась одна миграция на M1+M3; при реализации
  > M1 решено разнести по модулям (миграции иммутабельны после применения).
- **Идемпотентность:** обе через `create or replace`; завершить `notify pgrst, 'reload
schema'` (как `0012`).
- **Backward-compat:** имена старых 4 ключей `admin_stats` неизменны → старый код не
  ломается даже до обновления типов.
- **Гейт повторяется в каждой функции** (`if not is_admin() then raise 'forbidden'`)
  — это слой защиты БД, независимый от лэйаута.
- **`database.types.ts` (ручной):** дополнить `Functions.admin_stats` (Returns: Json,
  как есть) и добавить `Functions.admin_feedback_counts`. Формы фиксируют TS-интерфейсы
  `AdminStats` / `FeedbackCounts` в `queries.ts` (через `as unknown as`, как сейчас).
- **Откат:** `admin_stats` восстанавливается из `0012`; `admin_feedback_counts`
  дропается. Данные не мигрируются — функции stateless.

## 6. Безопасность (cross-cutting)

| Угроза                           | Где закрыта                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Не-админ читает агрегаты/counts  | БД-гейт `is_admin()` в `admin_stats` и `admin_feedback_counts` (raise `forbidden`) — независим от лэйаута `assertAdmin` и middleware |
| Не-админ строкам учеников        | по-прежнему **нет** RLS-доступа; M1 отдаёт только counts                                                                             |
| Перечисление email (enumeration) | `requestPasswordResetAction` всегда `{message}`, без ветвления по существованию                                                      |
| Open-redirect в recovery         | `redirectTo` из `env.appUrl`; `next` через `safeRedirect` (только внутренние пути)                                                   |
| Смена пароля без права           | `updatePasswordAction` требует активную recovery-сессию (`getUser()`); RLS/Auth — реальная граница                                   |
| Спам письмами                    | встроенный rate-limit Supabase Auth (своего не добавляем)                                                                            |

Трёхслойность админ-зоны (middleware → `assertAdmin` → БД) сохраняется; срез только
добавляет gated-функции в БД-слой.

## 7. Кэширование и ревалидация

- Обе админ-страницы — `export const dynamic = "force-dynamic"` (есть) → счётчики и
  списки всегда свежие; новый дашборд/инбокс ничего не кэшируют дополнительно.
- `setFeedbackStatusAction` уже делает `revalidatePath("/admin")` и
  `/admin/feedback` — после триажа обновятся и **новые** счётчики M3, и `feedback_new`
  на дашборде. Доп. ревалидации не нужны.
- M2 — auth actions завершаются `redirect`; кэш не вовлечён.

## 8. Состояния экранов (loading / empty / error)

| Экран                   | loading                    | empty                                                        | error                                           |
| ----------------------- | -------------------------- | ------------------------------------------------------------ | ----------------------------------------------- |
| `/admin` (M1)           | существующий `loading.tsx` | n/a (всегда числа, 0 — валиден)                              | существующий `error.tsx` (ловит `forbidden`)    |
| `/admin/feedback` (M3)  | существующий `loading.tsx` | `empty` (нет обращений) + `emptyFiltered` (нет под фильтром) | существующий `error.tsx`                        |
| `/forgot-password` (M2) | `pending` кнопки           | success-стейт `resetLinkSent`                                | `fieldErrors.email`                             |
| `/reset-password` (M2)  | `pending` кнопки           | —                                                            | `resetLinkInvalid` (нет сессии) / `fieldErrors` |

## 9. Карта изменений по файлам

**Создать:**

| Файл                                              | Модуль | Назначение                                                        |
| ------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `supabase/migrations/0013_admin_stats_v2.sql`     | M1     | расширить `admin_stats` (дельты, статусы уроков, активация/отток) |
| `supabase/migrations/0014_*.sql` (при M3)         | M3     | добавить `admin_feedback_counts`                                  |
| `src/features/admin/admin-stats.ts`               | M1     | `formatDelta`, `LESSON_STATUS_META` (чистая логика)               |
| `src/features/admin/lesson-status-cards.tsx`      | M1     | ряд карточек по статусам уроков                                   |
| `src/features/admin/health-cards.tsx`             | M1     | активация/отток/пульс                                             |
| `src/features/admin/feedback-category-filter.tsx` | M3     | фильтр-табы по категории + counts                                 |
| `src/features/auth/forgot-password-form.tsx`      | M2     | client-форма запроса ссылки                                       |
| `src/features/auth/reset-password-form.tsx`       | M2     | client-форма нового пароля                                        |
| `src/app/(auth)/forgot-password/page.tsx`         | M2     | RSC-обёртка                                                       |
| `src/app/(auth)/reset-password/page.tsx`          | M2     | RSC-обёртка (+проверка сессии)                                    |
| `src/app/auth/callback/route.ts`                  | M2     | GET: code-exchange → redirect                                     |
| `src/features/admin/admin-stats.test.ts`          | M1     | unit                                                              |

**Изменить:**

| Файл                                          | Модуль | Изменение                                                                                      |
| --------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `src/features/admin/queries.ts`               | M1+M3  | расширить `AdminStats`; +`FeedbackCounts`/`getFeedbackCounts`; `listFeedback(status,category)` |
| `src/features/admin/schema.ts`                | M3     | +`FEEDBACK_CATEGORIES`, `parseFeedbackCategory`                                                |
| `src/features/admin/admin-stats-cards.tsx`    | M1     | подпись дельты                                                                                 |
| `src/features/admin/feedback-filter-tabs.tsx` | M3     | counts + сохранение `category` в href                                                          |
| `src/app/(admin)/admin/page.tsx`              | M1     | три секции                                                                                     |
| `src/app/(admin)/admin/feedback/page.tsx`     | M3     | парсить `category`; `Promise.all` list+counts                                                  |
| `src/features/auth/schema.ts`                 | M2     | +`forgotPasswordSchema`, `resetPasswordSchema`                                                 |
| `src/features/auth/actions.ts`                | M2     | +`requestPasswordResetAction`, `updatePasswordAction`                                          |
| `src/features/auth/auth-form.tsx`             | M2     | ссылка «Забыли пароль?» (режим signin)                                                         |
| `src/lib/supabase/middleware.ts`              | M2     | +`/forgot-password`, `/reset-password` в `PUBLIC_PREFIXES`                                     |
| `src/lib/supabase/database.types.ts`          | M3     | тип `admin_feedback_counts` (для M1 не нужно — `admin_stats` уже `Returns: Json`)              |
| `src/lib/i18n/ru.ts`                          | все    | новые ключи (`admin.sections/lessonStatus`, `auth.forgot*`, `admin.feedback.categoryFilters`)  |
| `src/features/admin/schema.test.ts`           | M3     | тесты категории                                                                                |
| `src/features/auth/schema.test.ts`            | M2     | тесты схем сброса                                                                              |
| `docs/MVP.md`                                 | все    | строка «срез 11»                                                                               |

## 10. Архитектура тестов

- **Unit (vitest, без БД)** — только чистая логика: `admin-stats.test.ts`
  (`formatDelta`, `LESSON_STATUS_META`), `schema.test.ts` (категория), auth
  `schema.test.ts` (`forgotPasswordSchema`/`resetPasswordSchema`/`safeRedirect`).
- **RPC/RLS** — Supabase MCP (read-only) / ручной SQL: gated `forbidden` для
  не-админа, формы возврата функций.
- **e2e (Playwright)** — флоу M2 (запрос→письмо→сброс→вход; битая ссылка) и M3
  (комбинированный фильтр + счётчики); смоук M1 (секции рендерятся числами).

## 11. Порядок сборки, зависимости, риски

```
M1 (дашборд) ── миграция 0013 (admin_stats)        ✅ реализован
M3 (инбокс)  ── миграция 0014 (admin_feedback_counts)
M2 (пароль)  ── без миграции; зависит от SMTP Supabase
```

- **Рекомендованный порядок:** **M1 → M3 → M2**.
  - M1 самый изолированный (нет новых маршрутов/middleware, нет внешних предпосылок).
  - M3 — та же идиома gated-RPC, своя миграция `0014`; естественно сразу после M1.
  - M2 независим, но требует **операционной предпосылки** (SMTP/встроенная почта
    Supabase) — выносится так, чтобы код не блокировался настройкой инфраструктуры.
- **Связанность:** M1 и M3 делят `queries.ts` (зона `admin`), но **не** делят
  миграцию — каждая несёт свою (`0013` / `0014`).
- **Риски:**
  - `tutors_inactive_30d` — `NOT EXISTS` с join; на больших объёмах профилировать,
    при нужде вынести в отдельный gated RPC (см. [01](01_dashboard-stats.md)).
  - M2 без настроенного SMTP письма не дойдут — это конфиг Supabase, не код; пометить
    как чек перед релизом.
- **Откат:** M2 — снять маршруты/ссылку (схема не тронута). M1/M3 — откат `0013`
  (§5) + ревёрт типов/кода.

→ Спека: [00](00_specification.md) · модули [01](01_dashboard-stats.md) ·
[02](02_forgot-password.md) · [03](03_feedback-inbox.md).
