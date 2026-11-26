# 02 — Гейт доступа и редирект после входа

Серверный слой проверки роли. Защита трёхслойная и независимая:
**middleware (auth) → `assertAdmin()` (лэйаут) → БД (`admin_stats` raise + RLS)**.

## Middleware — НЕ трогаем

`/admin` не входит в `PUBLIC_PREFIXES` (`src/lib/supabase/middleware.ts`), значит
неаутентифицированный пользователь уже редиректится на `/login?redirect=/admin`.
Проверку роли в middleware **не добавляем** — это лишний запрос к БД на каждый
реквест (см. `docs/DESIGN`/perf-спеку). Известный минорный кейс: уже залогиненный
админ, вручную открывший `/login`, уедет на `/students` (middleware: authed на
auth-роуте → `/students`). Некритично.

## `src/lib/auth.ts` — добавить рядом с `getCurrentTutor`

```ts
/** Текущий пользователь — админ? Мемоизировано на запрос. */
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  return !error && data === true;
});

/**
 * Гейт для (admin)-лэйаута. Не залогинен → /login; залогинен, но не админ →
 * /students (домашняя репетитора). Мемоизировано, так что лэйаут+страница в одном
 * рендере делят один lookup.
 */
export const assertAdmin = cache(async (): Promise<void> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!(await getIsAdmin())) redirect("/students");
});
```

Импорты уже есть в файле (`cache`, `redirect`, `createClient`, `getCurrentUser`).

## `src/features/auth/actions.ts` → `signInAction` (точечно)

После успешного входа: явный `redirectTo` (deep-link) имеет приоритет; иначе
админ → `/admin`, репетитор → `DEFAULT_REDIRECT` (`/students`).

```ts
const supabase = await createClient();
const { error } = await supabase.auth.signInWithPassword(parsed.data);
if (error) {
  return { error: t.auth.invalidCredentials };
}

// Было: redirect(safeRedirect(formData.get("redirectTo")) ?? DEFAULT_REDIRECT);
const explicit = safeRedirect(formData.get("redirectTo"));
if (explicit) redirect(explicit);
const { data: isAdmin } = await supabase.rpc("is_admin");
redirect(isAdmin === true ? "/admin" : DEFAULT_REDIRECT);
```

Заметки:

- `signUpAction` **не трогаем** — новые регистрации админами не бывают.
- `safeRedirect` (защита от open-redirect) и `DEFAULT_REDIRECT = "/students"` уже в файле.
- Один лишний RPC на вход — пренебрежимо. `redirect()` бросает (паттерн Next), как и раньше.
- `features/auth` — общая зона (правила проекта): правка маленькая, ревьюим внимательнее.

## Поток (flow)

```
POST signInAction
  └─ signInWithPassword ok
       ├─ explicit redirectTo? → туда (deep-link сохраняется)
       └─ rpc is_admin
             ├─ true  → /admin     → (admin)/layout: assertAdmin() ✓ → дашборд
             └─ false → /students

GET /admin/*  (любой)
  └─ middleware: user? нет → /login?redirect=…
       └─ (admin)/layout: assertAdmin()
             ├─ не админ → /students
             └─ админ → рендер; данные тянутся через RLS/RPC (БД — последний рубеж)
```

## Проверка

- e2e (Playwright): вход админом → `/admin`; вход репетитором + ручной `/admin` →
  `/students`; разлогин на `/admin` → `/login?redirect=/admin`.
- `getIsAdmin`/`assertAdmin` — серверные, проверяются через сценарии выше (юнит без
  БД здесь не показателен).

→ Логика зоны и тесты: [`03_feature-zone.md`](03_feature-zone.md).
