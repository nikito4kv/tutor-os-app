# Спецификация — роль администратора (служебный аккаунт)

Фаза **S** (Specification) SPARC: контекст, требования, инварианты, критерии
приёмки и TDD-якоря. Псевдокод и модули реализации — в файлах `01`–`04`.
Решение зафиксировано в [`ADR-0003`](../../decisions/0003-admin-role.md).

## Контекст и цель

В tutorOS одна роль (репетитор). Кнопка «Поддержка» уже пишет в таблицу `feedback`
(`0006_feedback.sql`), но у неё только `INSERT`-политика и **нет `SELECT`** — читать
обращения в приложении нельзя. Нужен **внутренний служебный аккаунт** разработчиков:

1. **Инбокс обратной связи** — список обращений + триаж статуса (`new/seen/closed`).
2. **Дашборд** — общие цифры: репетиторы, ученики, уроки, новые обращения. Деньги — позже.

Это ops-инструмент, не продуктовая фича для репетиторов и **не** «мини-школа»
из `docs/ROADMAP.md`.

## Текущее состояние (as-is)

- Auth — Supabase, сессия в куках, рефреш в `src/lib/supabase/middleware.ts`.
  Защищённые маршруты — всё, кроме `PUBLIC_PREFIXES = ["/login","/signup","/s/","/auth"]`
  и `/`.
- `(app)/layout.tsx` гейтит через `getCurrentTutor()` (редирект на `/login`).
- Сайдбар (`src/components/layout/sidebar.tsx`) — статичный `NAV`-массив.
- RLS везде; владение через `tutor_id = auth.uid()` + `owns_student`.
- `feedback`: `tutor_id?`, `category`, `message`, `contact?`, `page_url?`,
  `user_agent?`, `status (new|seen|closed)`, `created_at`. Только `feedback_insert`.
- Типы БД — `src/lib/supabase/database.types.ts`, **написаны руками** «to match
  migrations» (проект пока не залинкован).
- Тесты — vitest, только чистая логика (`*.test.ts`), без БД.

## Модель ролей (to-be)

| Роль               | Носитель                       | Доступ                                             |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| `tutor` (как есть) | любой `auth.users`             | свой тенант через RLS                              |
| `admin` (новое)    | строка в `admin_user(user_id)` | агрегаты `admin_stats()` + чтение/триаж `feedback` |

Админ — обычный `auth.users`, чей `user_id` внесён в allowlist вручную. После входа → `/admin`.

## Доступ к данным (матрица)

| Что                                             | Кто              | Как                            | Гейт                             |
| ----------------------------------------------- | ---------------- | ------------------------------ | -------------------------------- |
| счётчики (tutors/students/lessons/feedback_new) | admin            | RPC `admin_stats()` (агрегаты) | `is_admin()` внутри функции      |
| строки `feedback` (read)                        | admin            | `select` через RLS             | политика `feedback_select_admin` |
| `feedback.status` (write)                       | admin            | `update` через RLS             | политика `feedback_update_admin` |
| строки `student/lesson/payment`                 | admin            | **нет доступа**                | — (только counts)                |
| `admin_user`                                    | никто из клиента | —                              | RLS без политик                  |

> Update: ADR-0004 adds read-only admin support screens for tutors/students via
> trusted server-side directory queries with explicit projections. This is still
> not broad client-side RLS access to tenant tables, and admins still do not
> manage lessons.
> The UI exposes them as one `/admin/users` section with a tutor/student switch;
> old `/admin/tutors` and `/admin/students` links redirect there.

## Решение (сводка)

1. Миграция `0012_admin_role.sql`: таблица `admin_user`, функция `is_admin()`,
   две admin-политики на `feedback`, функция `admin_stats()`. → [`01_data.md`](01_data.md).
2. Гейт `assertAdmin()` / `getIsAdmin()` в `src/lib/auth.ts` + редирект админа
   после входа в `signInAction`. → [`02_auth-gate.md`](02_auth-gate.md).
3. Фиче-зона `src/features/admin` (schema/queries/actions + компоненты + тесты),
   по эталону `features/students`. → [`03_feature-zone.md`](03_feature-zone.md).
4. Группа маршрутов `(admin)` + `AdminSidebar` + i18n. → [`04_ui-i18n.md`](04_ui-i18n.md).

## Инварианты (что НЕЛЬЗЯ сломать)

- **Источник схемы и прав — `supabase/migrations/`.** Через MCP схему/RLS не меняем.
- **Репетитор не может стать админом сам** — `admin_user` недостижима из клиента,
  колонку на `tutor` не заводим.
- **Админ не получает построчного доступа к данным учеников** — только агрегаты.
  Инбокс не резолвит email репетитора (только `contact` + флаг).
- **Существующая `feedback_insert`-политика сохраняется** — кнопка поддержки
  работает как раньше для всех.
- **Защита трёхслойная и независимая:** middleware (auth) → `assertAdmin` (лэйаут)
  → БД (`admin_stats` бросает `forbidden`, RLS фильтрует). Снятие одного слоя не
  открывает данные.
- **Бизнес-логика не в компонентах** (правила проекта): данные/мутации — в
  `queries.ts`/`actions.ts`. Supabase только через `lib/supabase/*`.
- **Все строки UI — через `t.*`**; цвета — токены; lucide-иконки.

## Нефункциональные требования

- TypeScript strict, без `any`. Тонкие компоненты, одна ответственность на модуль.
- Состояния `loading`/`empty`/`error` на каждом экране (`docs/DESIGN.md` §8).
- Светлая+тёмная тема; адаптив 375/768/1024/1440; контраст ≥4.5:1; фокус-ринг на
  табах/ссылках.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` — зелёные.

## Критерии приёмки (Definition of Done)

- [ ] Миграция `0012_admin_role.sql` применена; `database.types.ts` дополнен
      (`admin_user`, `is_admin`, `admin_stats`).
- [ ] Один dev-аккаунт внесён в `admin_user` (вручную, без коммита UUID).
- [ ] Вход админом → редирект `/admin`; видны 4 карточки с корректными числами.
- [ ] `/admin/feedback` — список обращений новейшие сверху; смена статуса в `<select>`
      сохраняется (после reload статус прежний); фильтр `?status=new` сужает список.
- [ ] Вход репетитором → ручной заход на `/admin` редиректит на `/students`;
      `rpc admin_stats` для не-админа возвращает `forbidden`; `select feedback`
      не отдаёт чужие строки.
- [ ] Пустой инбокс → `<EmptyState>`; брошенный запрос → `error.tsx`.
- [ ] Существующая отправка из кнопки «Поддержка» по-прежнему работает.
- [ ] CI зелёный; `any` нет; строки через `t.*`; цвета — токены.

## TDD-якоря / план проверки

- **Юнит (vitest, без БД)** — `src/features/admin/schema.test.ts`:
  - `parseFeedbackFilter("new") === "new"`; `parseFeedbackFilter(undefined|"мусор") === "all"`.
  - `parseFeedbackStatusForm` принимает валидный статус, отклоняет пустой/левый.
  - meta-мапы категории/статуса дают подпись и `Badge`-вариант для каждого значения enum.
- **RLS/доступ (Supabase MCP read-only или SQL)** — см. [`01_data.md`](01_data.md) §«Проверка».
- **e2e/ручной (Playwright, localhost:3000)** — сценарии из DoD (вход админом/репетитором,
  триаж, фильтр, редиректы).

## Вне скоупа (тонко, на потом)

Деньги/выручка на дашборде; разбивка уроков по статусам; активные пакеты; резолв
email/имени репетитора в инбоксе; ответы из приложения; UI управления админами
(только SQL); продуктовые роли «мини-школы»; проверка роли в middleware.

→ Данные и миграция: [`01_data.md`](01_data.md).
