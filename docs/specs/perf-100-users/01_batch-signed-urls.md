# Псевдокод — P1: батч signed URLs

Файлы: `src/features/homework/files.ts`, `src/features/share/queries.ts`,
`src/features/homework/queries.ts`. Требования: §2 спеки (`00_specification.md`).
Сложность: низкая, без миграции.

## Текущее (N+1 по сети)

```
# files.ts — один путь = один HTTP-запрос к Storage
FUNCTION createHomeworkSignedUrl(supabase, path):
    IF path == null: RETURN null
    data, error = supabase.storage.from(BUCKET).createSignedUrl(path, 60*60)
    IF error: RETURN null
    RETURN data.signedUrl

# share/queries.ts И homework/queries.ts — вызывают ^ на КАЖДЫЙ файл
FOR EACH hw IN homework:           # 30 ДЗ
    attachmentSignedUrl = AWAIT createHomeworkSignedUrl(supabase, hw.attachment_url)   # +1 HTTP
    submissionSignedUrl = AWAIT createHomeworkSignedUrl(supabase, hw.submission_url)   # +1 HTTP
# → до 60 исходящих HTTP-запросов на один рендер; force-dynamic → каждый раз заново
```

## Целевое

### 1) `files.ts` — батч-хелпер + чистые функции + константа

```
CONST HOMEWORK_SIGNED_URL_TTL_SEC = 3600   # рядом с HOMEWORK_BUCKET, не инлайн

# Чистая: собрать уникальные непустые пути из набора ДЗ-подобных строк.
FUNCTION collectHomeworkPaths(rows): string[]
    paths = []
    FOR EACH r IN rows:
        IF r.attachment_url: paths.push(r.attachment_url)
        IF r.submission_url: paths.push(r.submission_url)
    RETURN unique(paths)               # дедуп (EC-P1-3)

# Один сетевой вызов на все пути → Map<path, signedUrl>.
ASYNC FUNCTION createHomeworkSignedUrls(supabase, paths): Map<string,string>
    clean = unique(paths.filter(nonEmpty))
    IF clean.length == 0: RETURN new Map()          # FR-P1-2: сети нет (EC-P1-1)
    data, error = AWAIT supabase.storage.from(BUCKET)
                        .createSignedUrls(clean, HOMEWORK_SIGNED_URL_TTL_SEC)
    IF error: RETURN new Map()                       # весь батч не удался → все null
    map = new Map()
    FOR EACH item IN (data ?? []):
        IF item.signedUrl AND NOT item.error:        # per-item ошибка → пропуск (EC-P1-2)
            map.set(item.path, item.signedUrl)
    RETURN map

# Чистая: разрешить ссылки одной ДЗ по готовой Map (отсутствует → null).
FUNCTION resolveSignedUrl(map, path): string | null
    RETURN path ? (map.get(path) ?? null) : null

# Совместимость (FR-P1-5): одиночный хелпер — тонкая обёртка над батчем.
ASYNC FUNCTION createHomeworkSignedUrl(supabase, path):
    IF NOT path: RETURN null
    map = AWAIT createHomeworkSignedUrls(supabase, [path])
    RETURN resolveSignedUrl(map, path)
```

### 2) `share/queries.ts` — один батч в `getShareView`

```
# ... student / packages / lessons / homework как сейчас (Promise.all) ...
paths = collectHomeworkPaths(homework ?? [])
signed = AWAIT createHomeworkSignedUrls(supabase, paths)        # 1 запрос вместо 2N

homeworkWithSignedUrls = (homework ?? []).map(item => ({
    id, title, description, status, submission_text, feedback, due_at,   # как сейчас
    attachmentSignedUrl: resolveSignedUrl(signed, item.attachment_url),
    submissionSignedUrl: resolveSignedUrl(signed, item.submission_url),
}))
# форма результата неизменна (INV-P1)
```

### 3) `homework/queries.ts` — то же в `listHomeworksByStudent`

```
data = AWAIT supabase.from("homework").select(<нужные колонки>)
                     .eq("student_id", studentId)
                     .order("created_at", desc)
                     .limit(STUDENT_HISTORY_LIMIT)               # лимит из P3
paths  = collectHomeworkPaths(data)
signed = AWAIT createHomeworkSignedUrls(supabase, paths)         # 1 запрос
RETURN data.map(hw => ({ ...hw,
    attachmentSignedUrl: resolveSignedUrl(signed, hw.attachment_url),
    submissionSignedUrl: resolveSignedUrl(signed, hw.submission_url),
}))
```

## Заметки

- `createSignedUrls` (мн. ч.) принадлежит **одному бакету** — все пути ДЗ лежат в
  `HOMEWORK_BUCKET`, так что один вызов покрывает и `attachment`, и `submission`.
- Возвращаемый storage-js массив содержит `{ path, signedUrl, error }` по каждому пути; на
  ошибочных элементах `error != null` → не кладём в Map → потребитель получит `null` (как
  сейчас при сбое одиночной подписи). Поведение для UI не меняется.
- `unique()` — простой `Array.from(new Set(...))`. Дубликаты редки (assignment ≠ submission),
  но дедуп страхует и слегка сокращает payload.
- TTL вынесен в константу рядом с `HOMEWORK_BUCKET`/`HOMEWORK_MAX_FILE_BYTES` (тот же стиль
  co-located storage-констант), а не в общий `constants.ts`.
- Лимит истории ДЗ (`STUDENT_HISTORY_LIMIT`) приходит из P3 — здесь просто применяется.

## TDD-анкеры

Сетевые вызовы Supabase Storage юнит-тестом не покрыть; тестируем **чистые** функции и
проверяем число запросов контрактом.

```
# Юнит (vitest) — collectHomeworkPaths
TEST "collects both file fields, drops nulls, dedupes":
    GIVEN rows=[{attachment_url:'a', submission_url:null},
                {attachment_url:'a', submission_url:'b'}]
    THEN  collectHomeworkPaths(rows) == ['a','b']               # AC-P1-4

TEST "empty rows → no paths":
    THEN  collectHomeworkPaths([]) == []                        # EC-P1-1

# Юнит — resolveSignedUrl / mergeSignedUrls
TEST "resolves present path, null for missing or empty":
    GIVEN map={'a'->'https://signed/a'}
    THEN  resolveSignedUrl(map,'a') == 'https://signed/a'
    AND   resolveSignedUrl(map,'x') == null                     # EC-P1-2
    AND   resolveSignedUrl(map,null) == null

# Контракт сети (ручной / Network tab)
TEST "share page issues ONE storage sign request":
    GIVEN ученик с N ДЗ (по 2 файла)
    WHEN  открыть /s/[token]
    THEN  ровно 1 запрос createSignedUrls (не 2N)               # AC-P1-1

TEST "homework tab — one batch request":                        # AC-P1-2
TEST "homework without files → zero storage requests":          # AC-P1-3
```
