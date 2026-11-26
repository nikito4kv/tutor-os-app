# 02 — Самостоятельное восстановление пароля

Закрываем дыру walking-skeleton: репетитор, забывший пароль, должен сам вернуть
доступ. Стандартный флоу Supabase Auth (PKCE), **без изменения схемы/RLS**, без
service-role, без app-слоя email. Это **пользовательская** фича (не админская
операция над чужим аккаунтом — то 🔴 и в ADR-0004).

## Флоу (3 шага)

```
[/forgot-password]  ── email ──▶  resetPasswordForEmail(email, { redirectTo })
        │                              │
        │                              ▼
        │                    письмо Supabase Auth со ссылкой
        ▼                              │  (?code=…)
 «если такой email есть —              ▼
  мы отправили ссылку»        [GET /auth/callback?code=…&next=/reset-password]
 (anti-enumeration)                    │  exchangeCodeForSession(code)
                                       ▼  устанавливает recovery-сессию
                              [/reset-password]  ── новый пароль ──▶ updateUser({ password })
                                       │
                                       ▼
                              успех → редирект /students
```

## Маршруты (route group `(auth)`)

- `(auth)/forgot-password/page.tsx` — форма «введите email».
- `(auth)/reset-password/page.tsx` — форма «новый пароль» (требует recovery-сессию;
  нет сессии → состояние «ссылка недействительна/устарела»).
- `app/auth/callback/route.ts` — **route handler** (GET): принимает `?code`,
  `exchangeCodeForSession(code)`, затем `redirect(next ?? "/reset-password")`. Лежит
  под уже-public префиксом `/auth`.

## Middleware

В [middleware.ts](../../../src/lib/supabase/middleware.ts) добавить в
`PUBLIC_PREFIXES`: `"/forgot-password"`, `"/reset-password"`. `/auth` уже public.

> `/reset-password` делаем public, чтобы при истёкшем/битом коде показать дружелюбное
> «ссылка устарела», а не редиректить на `/login`. Реальная защита — наличие
> recovery-сессии (проверяем на странице); без неё форма не сабмитится.

## Схемы (`features/auth/schema.ts` — дополнить)

```ts
// email уже определён (trim+lowercase+email). Переиспользуем PASSWORD_RULES.
export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({ password: signUpPassword, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, {
    message: t.auth.passwordsDontMatch,
    path: ["confirmPassword"],
  });
```

## Server actions (`features/auth/actions.ts` — дополнить)

```ts
// 1) Запрос ссылки. НИКОГДА не палим существование email.
export async function requestPasswordResetAction(_prev, formData): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  // redirectTo строим из env.appUrl (НЕ из заголовков запроса — open-redirect/host-spoof).
  const redirectTo = `${env.appUrl}/auth/callback?next=/reset-password`;
  await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo });
  // Всегда один и тот же ответ, даже если email неизвестен / произошла ошибка.
  return { message: t.auth.resetLinkSent };
}

// 2) Установка нового пароля (recovery-сессия активна после code-exchange).
export async function updatePasswordAction(_prev, formData): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.flatten().fieldErrors) };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t.auth.resetLinkInvalid }; // нет recovery-сессии

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: t.common.errorTitle };
  redirect(DEFAULT_REDIRECT); // /students
}
```

`/auth/callback` route handler:

```ts
// app/auth/callback/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRedirect(url.searchParams.get("next")) ?? "/reset-password";
  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code); // ставит recovery-сессию в куку
  }
  return NextResponse.redirect(new URL(next, env.appUrl));
}
```

## UI

- **Ссылка «Забыли пароль?»** на форме входа (`features/auth/auth-form.tsx`, режим
  `signin`) → `/forgot-password`.
- `forgot-password` — переиспользует визуальный каркас `(auth)` (бренд-панель,
  `Card`), поле email, кнопка `t.auth.resetCta`, после отправки — нейтральный
  success-стейт `t.auth.resetLinkSent` + ссылка «Вернуться ко входу».
- `reset-password` — поле нового пароля + повтор, **live-чеклист `PASSWORD_RULES`**
  (переиспользовать существующий компонент из signup), кнопка `t.auth.resetSubmit`.
  Нет recovery-сессии → `<ErrorState>` `t.auth.resetLinkInvalid` + ссылка
  «Запросить новую».

## i18n (`ru.ts`, ветка `auth` — дополнить)

```ts
auth: {
  ...,
  forgotLink: "Забыли пароль?",
  forgotTitle: "Восстановление доступа",
  forgotSubtitle: "Укажите email — пришлём ссылку для смены пароля.",
  resetCta: "Прислать ссылку",
  resetLinkSent: "Если такой email зарегистрирован, мы отправили ссылку для сброса.",
  backToSignIn: "Вернуться ко входу",
  resetTitle: "Новый пароль",
  resetSubtitle: "Придумайте новый пароль для входа.",
  resetSubmit: "Сохранить пароль",
  resetLinkInvalid: "Ссылка недействительна или устарела. Запросите новую.",
  requestNewLink: "Запросить новую ссылку",
}
```

## Email — операционная предпосылка

Письмо восстановления отправляет **сам Supabase Auth** (шаблон Recovery). Для прод-
отправки в Supabase должен быть настроен SMTP (или включён встроенный отправитель
для dev). Это конфигурация проекта Supabase, **не** код приложения.

> `resend` из зависимостей здесь **не используется** — брендированное письмо через
> app-слой это отдельная, отложенная задача (см. «Вне скоупа» в `00`). Для среза
> хватает дефолтного письма Supabase.

## Безопасность

- **Anti-enumeration:** `requestPasswordResetAction` всегда отвечает одинаково.
- **redirectTo — только из `env.appUrl`**, не из заголовков запроса (host-spoofing).
- **`next` валидируется** существующим `safeRedirect` (только внутренние пути).
- Rate-limiting запросов писем — встроенный в Supabase Auth; своего не добавляем.
- На входе (`signInSchema`) политику пароля не навязываем (старые пароли); на сбросе
  — навязываем `signUpPassword` (как при регистрации).

## TDD-якоря (vitest, без БД)

`src/features/auth/schema.test.ts` (дополнить):

- `forgotPasswordSchema` принимает валидный email (с trim/lowercase), отклоняет мусор.
- `resetPasswordSchema` отклоняет несовпадающие пароли (`path: confirmPassword`) и
  пароль, не проходящий `PASSWORD_RULES`; принимает валидную пару.
- `safeRedirect` (существующие тесты) покрывают `next` для callback (внутренний путь
  ок; `//host`, `http://…` → undefined).

Флоу e2e (Playwright, localhost:3000): запрос ссылки → нейтральный ответ; переход по
ссылке → форма нового пароля → вход новым паролем; битый код → «ссылка устарела».

## Definition of Done (модуль)

- [ ] `/forgot-password`, `/reset-password`, `/auth/callback` работают; префиксы
      добавлены в middleware.
- [ ] Неизвестный email не палится (один и тот же ответ).
- [ ] По валидной ссылке можно задать пароль и войти; битая ссылка → дружелюбная ошибка.
- [ ] «Забыли пароль?» доступно со страницы входа.
- [ ] Состояния loading/empty(success)/error; строки `t.*`; цвета — токены; `any` нет.
- [ ] Unit-тесты схем зелёные.
