# Проверки проекта

## Быстрые проверки

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Эти команды выполняются workflow `.github/workflows/ci.yml` для push в `main` и
`dev`, а также для каждого pull request.

## Интеграционные тесты Supabase

Нужен запущенный Docker. Локальный Supabase применяет миграции из
`supabase/migrations/` к отдельной тестовой базе.

```bash
pnpm exec supabase start
```

Получите локальные переменные командой:

```bash
pnpm exec supabase status -o env
```

Перед запуском задайте:

- NEXT_PUBLIC_SUPABASE_URL из API_URL;
- NEXT_PUBLIC_SUPABASE_ANON_KEY из ANON_KEY;
- `SUPABASE_SERVICE_ROLE_KEY` из `SERVICE_ROLE_KEY`;
- `RUN_SUPABASE_INTEGRATION=1`.

Затем выполните:

```bash
pnpm test:integration
pnpm exec supabase stop --no-backup
```

Интеграционные тесты создают собственные данные и удаляют их после выполнения.
Production-проект и production-секреты для них не используются.
