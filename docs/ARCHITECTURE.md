# ARCHITECTURE

## Стек

- **Фронт:** Next.js (App Router) + TypeScript (strict) + Tailwind + shadcn/ui.
  Формы — React Hook Form + Zod (валидация на сервере через Zod в actions).
- **Бэкенд/БД/Auth/Storage:** Supabase (Postgres + Auth + Storage), доступы — RLS.
  Серверная логика — Server Actions / route handlers Next.js.
- **Видео:** Daily.co (prebuilt) — отложено. **Доска:** tldraw — отложено.
- **Email:** Resend. **Хостинг:** Vercel. **Пакетный менеджер:** pnpm.
- Сознательно **без тяжёлого бэкенда** (NestJS/Prisma/Redis/BullMQ) — см. ADR-0001.

## Карта кода

```
src/app/(auth)/         вход/регистрация (публичные)
src/app/(app)/          защищённое: dashboard, students, schedule, settings
src/app/s/[token]/      ссылка ученика без логина
src/features/<зона>/    schema.ts (Zod) · queries.ts (чтение) · actions.ts (мутации) · *.tsx
src/lib/                config · supabase{client,server,admin,middleware} · i18n · currency · date · utils · constants
supabase/migrations/    единственный источник схемы и RLS
```

## Модель данных

```
tutor    (= Supabase Auth user)  id, name, email, currency, created_at
student   id, tutor_id, name, contact, parent_contact, subject, level, share_token (unique), created_at
package   id, student_id, total_lessons, lessons_left, price, created_at
payment   id, student_id, amount, paid_at, note, created_at        (ручной учёт)
lesson    id, student_id, starts_at, duration_min, status(scheduled|done|canceled), topic, note, room_name, created_at
homework  id, student_id, lesson_id?, title, description, attachment_url,
          status(assigned|submitted|reviewed), submission_text, submission_url, feedback, created_at
feedback  id, tutor_id?, category, message, contact, page_url, user_agent, status, created_at
chat_message id, student_id, sender(tutor|student), body, attachment_*, read_at, created_at
```

Баланс занятий = `sum(package.lessons_left)` по ученику. `room_name` зарезервирован
под отложенный срез видео. Поля «на вырост» добавляем аккуратно; таблиц под
отложенные фичи (лиды, метрики, организации) сейчас **нет**.

## Механика «Завершить урок» (сердце skeleton)

Реализована **в одном месте, синхронно, атомарно** — функция Postgres
`complete_lesson(p_lesson_id, p_topic?, p_note?)` (`supabase/migrations/0001_init.sql`):

1. помечает урок `done` (идемпотентно — повторный вызов не списывает дважды);
2. списывает 1 занятие со старейшего пакета, где `lessons_left > 0` (`for update`);
3. возвращает `{ lessons_left, low_balance }` для UI-флага «пора пополнить».

Функция `SECURITY INVOKER` — работает под RLS вызывающего, т.е. репетитор может
завершить только свой урок. Вызов из приложения: `supabase.rpc('complete_lesson', …)`.
Никаких очередей и воркеров — это осознанно (ADR-0001).

## Доступ и безопасность

- **RLS включён** на всех таблицах. Репетитор видит только свои
  `student/package/payment/lesson/homework` (через `tutor_id` и helper `owns_student`).
- **Профиль tutor** создаётся триггером `handle_new_user` при регистрации. Серверная
  идентичность всегда проверяется через `auth.getUser()`; `getSession()` не используется
  как основание для авторизации. Отсутствующий профиль считается ошибкой, fallback нет.
- **Server Actions уроков** получают `student_id`, `series_id` и исходную дату из
  RLS-авторизованной строки урока. Скрытые поля формы не определяют получателя уведомления.
- **Обратная связь** доступна только аутентифицированному репетитору и записывается с
  `tutor_id = auth.uid()` (миграция `0018_security_boundaries.sql`).
- **Секреты webhook/cron** принимаются только в заголовках и сравниваются timing-safe.
  Приложение отдаёт security headers; CSP на первом этапе работает в `Report-Only`.
- **Ссылка ученика** (`/s/[token]`): без логина, доступ только по неугадываемому
  `share_token`. Реализована через **service-role клиент** (`lib/supabase/admin`) в
  доверенном серверном коде, где **каждый запрос скоупится по токену**. Это
  единственный санкционированный обход RLS. Service-role ключ — только на сервере
  (`server-only`), никогда не уходит в клиент. Через токен — read-only + (в срезе 7)
  возможность сдать ДЗ.
- **Секреты** — только в `.env` (см. `.env.example`), доступ через `lib/config.ts`.
- **Данные учеников** (часто дети) чувствительны: не храним лишнего, не логируем ПДн.

## Внутренний чат

Чат — узкая переписка преподавателя с конкретным учеником. Преподаватель видит диалоги в `/messages` и во вкладке карточки ученика; ученик пишет со своей публичной страницы `/s/[token]`. Таблица `chat_message` хранит текст до 1000 символов и метаданные одного вложения; сами файлы лежат в приватном Storage bucket `chat-files` с лимитом 10 МБ. Отправка идет через Server Actions, после записи выполняется `revalidatePath` для страницы чатов, карточки ученика и публичной ссылки. `read_at` фиксирует момент прочтения адресатом; активный диалог подписывается на изменения `chat_message` через Supabase Realtime и обновляет серверные данные без ручной перезагрузки.

Доступ преподавателя идет через RLS и helper `owns_student(student_id)`: можно читать сообщения своих учеников и создавать сообщения только с `sender = 'tutor'`. Публичная страница ученика не получает прямой доступ к таблице или bucket; она использует service-role клиент только в доверенном серверном коде и всегда скоупится по `share_token`. Чтение файлов идет через короткоживущие signed URL.

## Email

Resend, тонко: напоминание об уроке и выдача ДЗ. Пока ключ не задан — **мок**
(вызовы логируются, письма не уходят). Включается заданием `RESEND_API_KEY`.
