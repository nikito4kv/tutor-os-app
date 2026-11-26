# Псевдокод — P2: проверенная серверная авторизация

Файл: `src/lib/auth.ts`. Актуализация безопасности: 2026-07-03.

## Целевое поведение

```text
# middleware.ts: refresh cookies и ранний redirect
updateSession(request):
    user = AWAIT supabase.auth.getUser()
    IF protected route AND !user: redirect("/login")

# lib/auth.ts: отдельная проверка для Server Components / Server Actions
getCurrentUser = cache(ASYNC () => {
    supabase = AWAIT createClient()
    { user, error } = AWAIT supabase.auth.getUser()
    RETURN error ? null : user
})

getCurrentTutor = cache(ASYNC () => {
    user = AWAIT getCurrentUser()
    IF !user: redirect("/login")

    supabase = AWAIT createClient()
    { tutor, error } = AWAIT supabase
        .from("tutor")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

    IF error OR !tutor: THROW integrity error
    RETURN tutor
})
```

`cache()` устраняет повторные page-level вызовы внутри одного Server Components render,
но не заменяет проверку JWT. В типичной защищённой навигации остаются две проверки
`getUser()`: middleware и memoized server helper. Это сознательная цена корректной
границы доверия.

## Запрещённые оптимизации

- Не использовать `getSession()` для server-side authorization: он читает cookie без
  подтверждения пользователя Auth-сервером.
- Не считать факт выполнения middleware доказательством, которое можно неявно передать
  последующим Server Actions или render-коду.
- Не создавать tutor profile из `user_metadata`, если строка таблицы отсутствует.
- Не кэшировать user/profile между запросами глобальным cache или singleton.

## TDD-якоря

```text
TEST "server auth verifies user":
    WHEN getCurrentUser()
    THEN auth.getUser called once
    AND unverified getSession is not part of the implementation

TEST "missing tutor profile fails closed":
    GIVEN verified user and no tutor row
    WHEN getCurrentTutor()
    THEN request fails with integrity error
    AND no synthetic profile is returned

TEST "logged-out user is redirected":
    GIVEN auth.getUser returns no user
    WHEN protected route requests current tutor
    THEN redirect points to /login with preserved return path
```

Тесты реализации находятся в `tests/unit/server-auth.test.ts`.
