# tutorOS

Рабочее место соло-репетитора: учёт занятий, оплат и домашек + (позже) урок с
видео и доской внутри. Тонкий MVP для проверки гипотезы на живых репетиторах.

> Русская версия описания проекта. Основной README — на английском: [../README.md](../README.md).
> Для знакомства с продуктом прочитай [PRODUCT.md](./PRODUCT.md) и [MVP.md](./MVP.md).

## Стек

Next.js (App Router) · TypeScript strict · Tailwind + shadcn/ui · Supabase
(Postgres + Auth + Storage, RLS) · Resend · Vercel · pnpm. Видео (Daily.co) и
доска (tldraw) — отложенный срез. Обоснование — [ADR-0001](./decisions/0001-stack.md).

## Быстрый старт

```bash
pnpm install
cp .env.example .env.local   # заполни ключи Supabase — см. docs/SETUP.md
pnpm dev                     # http://localhost:3000
```

Полная настройка (Supabase, миграции, Resend, Vercel) — [docs/SETUP.md](./SETUP.md).

## Команды

| Команда          | Что делает          |
| ---------------- | ------------------- |
| `pnpm dev`       | дев-сервер          |
| `pnpm build`     | прод-сборка         |
| `pnpm lint`      | ESLint              |
| `pnpm typecheck` | проверка типов      |
| `pnpm test`      | юнит-тесты (Vitest) |
| `pnpm e2e`       | e2e (Playwright)    |
| `pnpm format`    | Prettier            |

## Переменные окружения

Список и описание — [`.env.example`](../.env.example). Секреты только в `.env.local`,
доступ из кода — через `src/lib/config.ts`. Service-role ключ — только на сервере.

## Документация

- [docs/PRODUCT.md](./PRODUCT.md) — суть, гипотеза, пользователи, отличие
- [docs/MVP.md](./MVP.md) — скоуп, walking skeleton, что отложено
- [docs/ARCHITECTURE.md](./ARCHITECTURE.md) — схема, модель данных, «Завершить урок», RLS
- [docs/SETUP.md](./SETUP.md) — ключи и шаги
- [docs/ROADMAP.md](./ROADMAP.md) — что после MVP
- [docs/decisions/](./decisions/) — ADR
