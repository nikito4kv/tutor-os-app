# SETUP — окружение и ключи

## Локальный запуск

```bash
pnpm install
cp .env.example .env.local   # заполни значения (см. ниже)
pnpm dev                     # http://localhost:3000
```

Команды: `pnpm dev | build | start | lint | typecheck | test | e2e | format`.

## Supabase (Postgres + Auth + Storage)

1. Создай проект на [supabase.com](https://supabase.com).
2. **Settings → API** → скопируй в `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (**только сервер**, не коммитить, не отдавать клиенту)
3. Применить миграции (схема + RLS + функция `complete_lesson` + бакет Storage):
   ```bash
   pnpm dlx supabase login
   pnpm dlx supabase link --project-ref <ref>
   pnpm dlx supabase db push
   ```
   Либо вручную выполнить `supabase/migrations/*.sql` в SQL-редакторе (по порядку).
4. **Auth → Providers → Email:** для MVP отключи «Confirm email», чтобы регистрация
   сразу давала сессию (иначе пользователь увидит «проверьте почту»).
5. **Auth → Sign In / Providers → Email (политика пароля):** настрой так, чтобы
   серверная проверка совпадала с формой регистрации:
   - **Minimum password length = 8** (синхронно с `PASSWORD_MIN` в
     `src/features/auth/schema.ts`).
   - **Password Requirements = lower + upper letters, digits, symbols** — те же 5
     правил, что проверяет форма (`PASSWORD_RULES` в `schema.ts`).
   - **Leaked password protection** (HaveIBeenPwned, в разделе **Attack Protection**) —
     включить, если позволяет тариф (на бесплатном плане недоступно, можно пропустить).
     Отклонённый сервером пароль форма покажет понятным сообщением (`t.auth.weakPassword`).
6. (Опц.) Перегенерировать типы БД:
   `pnpm dlx supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.

## App

- `NEXT_PUBLIC_APP_URL` — публичный URL (локально `http://localhost:3000`), нужен
  для построения ссылок ученика `/s/<token>`.

## Support feedback

Форма **«Поддержка»** сохраняет обращения в таблицу `public.feedback`.

Где смотреть обращения разработчику:

- Supabase Dashboard → Table Editor → `feedback`;
- или Supabase Dashboard → SQL Editor:
  ```sql
  select created_at, category, message, contact, page_url, status
  from public.feedback
  order by created_at desc;
  ```

Если приложение пишет `Could not find the table 'public.feedback' in the schema cache`,
значит миграция с таблицей ещё не применена к текущему Supabase-проекту или Data API
не перечитал схему. Выполни `supabase/migrations/0006_feedback.sql` в SQL Editor
или запусти `supabase/fix.sql`, затем обнови страницу приложения.

## Resend (email) — бесплатно (3000/мес, 100/день)

Локально ключ можно не задавать — письма **мокаются** (логируются, наружу не уходят), dev
остаётся офлайн. Реальная отправка включается, когда задан `RESEND_API_KEY`.

Письма двух видов: **системные** (сброс пароля/подтверждение — их шлёт Supabase) и **свои
транзакционные** (выдача ДЗ, запланированные уроки — их шлёт код через `src/lib/email`). Оба идут
с одного подтверждённого домена.

### 1. Домен и DNS (нужно для доставки в Яндекс/Mail.ru/Gmail)

1. На [resend.com](https://resend.com) → **Domains** → добавь домен `tutor-os.online`.
2. Пропиши в DNS выданные записи: **SPF** (TXT) и **DKIM** (CNAME). Добавь **DMARC** TXT:
   `v=DMARC1; p=none;` — без него российские провайдеры часто режут письма. Дождись статуса
   _Verified_.
3. **API Keys** → создай ключ → это `RESEND_API_KEY`.
4. `EMAIL_FROM="tutorOS <noreply@tutor-os.online>"` — адрес обязан быть на проверенном домене.

> SSL-сертификат для писем **не нужен**: почта работает на DNS (SPF/DKIM/DMARC), TLS обеспечивает
> сам `smtp.resend.com`. SSL нужен только сайту и выдаётся бесплатно/автоматически (Vercel —
> Let's Encrypt; см. раздел Vercel).

### 2. Системные письма Supabase через Resend (снимает лимит 2/час)

Встроенная почта Supabase ограничена **2 письмами в час** — для прода нужен свой SMTP. Укажи Resend:
**Authentication → SMTP Settings** → Enable custom SMTP:

- Host `smtp.resend.com`, Port `465`, Username `resend`, Password = **Resend API-ключ**,
  Sender email `noreply@tutor-os.online`, Sender name `tutorOS`.

Код auth-флоу при этом не меняется (`resetPasswordForEmail`, `/auth/confirm`, `updatePasswordAction`).

## Telegram-бот (уведомления) — срез 11

Локально токен можно не задавать — сообщения **мокаются** (логируются, наружу не
уходят), как и email без ключа. Реальная отправка включается, когда задан
`TELEGRAM_BOT_TOKEN`. Архитектура и решения — `docs/decisions/0005-telegram-notifications.md`.

### 1. Создать бота

1. В Telegram напиши [@BotFather](https://t.me/BotFather) → `/newbot` → задай имя и
   `@username`. Скопируй токен.
2. В `.env.local` (и в Vercel, см. ниже):
   - `TELEGRAM_BOT_TOKEN` — токен от BotFather;
   - `TELEGRAM_BOT_USERNAME` — `@username` бота **без `@`** (для построения ссылок
     `t.me/<username>?start=…`);
   - `TELEGRAM_WEBHOOK_SECRET` — придумай длинную случайную строку;
   - `CRON_SECRET` — придумай длинную случайную строку (для внешнего крона).

### 2. Зарегистрировать webhook

Telegram должен слать апдейты на наш эндпоинт. Выполни один раз (подставь значения):

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -d "url=https://<APP_URL>/api/telegram/webhook" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

`<APP_URL>` — боевой/preview-домен. Локально (`localhost`) webhook недоступен извне —
используй туннель (например `cloudflared`/`ngrok`) и его URL в `setWebhook`.

### 3. Внешний крон для отложенных напоминаний

Напоминания «за 24ч/2ч до урока» и «дедлайн ДЗ» шлёт `GET /api/cron/notifications`,
который нужно дёргать по расписанию (планировщика в проекте нет — выбран внешний
триггер, см. ADR-0005). Настрой на [cron-job.org](https://cron-job.org) или GitHub
Actions запрос **каждые ~15 минут**:

```
GET https://<APP_URL>/api/cron/notifications
Authorization: Bearer <CRON_SECRET>
```

Секрет принимается только в заголовке `Authorization`; провайдер крона должен уметь
задавать HTTP-заголовки. Эндпоинт идемпотентен — лишний вызов безвреден (повторная
отправка отсекается по `notification.dedup_key`). Не передавайте секрет в URL: адреса
попадают в историю браузера, access logs и системы аналитики.

### 4. Vercel

Добавь те же переменные в **Settings → Environment Variables** (scope Production →
боевой бот; Preview → тестовый бот, если заводишь отдельного). После деплоя выполни
`setWebhook` на нужный домен и настрой крон на тот же домен.

## Daily.co (видео) — отложено (срез 8)

- `DAILY_API_KEY`. Не нужен для учётного ядра; оставь пустым.

## Vercel (хостинг) + окружения prod/dev

Бесплатный тариф Hobby. Модель деплоя совпадает с веткованием:

- **`main` → Production** (боевой домен).
- Любая другая ветка, в т.ч. **`dev`, → Preview** (отдельный авто-URL на каждый push).

### Две базы Supabase (бесплатно, до 2 проектов)

Заведи `tutor-os-prod` и `tutor-os-dev` по шагам выше (миграции применить в обе).
Так данные прода и тестов не смешиваются.

### Шаги

1. Импортируй репозиторий на Vercel — framework определится как Next.js.
2. **Settings → Environment Variables**, добавь переменные с разными scope:
   - scope **Production** → ключи `tutor-os-prod`;
   - scope **Preview** → ключи `tutor-os-dev`.
     Переменные: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` (+ при желании `RESEND_API_KEY`, `EMAIL_FROM`).
3. `NEXT_PUBLIC_APP_URL` можно **не задавать** — приложение само возьмёт адрес Vercel
   (`VERCEL_URL`). Для production подключи домен: **Settings → Domains** → добавь
   `tutor-os.online` (Vercel сам выпустит и продлит бесплатный SSL-сертификат Let's Encrypt),
   затем задай `NEXT_PUBLIC_APP_URL=https://tutor-os.online` в scope Production — он формирует
   ссылки в письмах.
4. **Settings → Git** → Production Branch = `main`. Push в `main` → прод, push в `dev`
   → preview. CI (`.github/workflows/ci.yml`) проверяет каждый PR до мёржа.
5. В Supabase каждого проекта: **Authentication → URL Configuration** добавь домены
   Vercel в Redirect URLs (прод-домен и `*.vercel.app` для preview).
