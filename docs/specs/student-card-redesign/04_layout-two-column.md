# Псевдокод — L: раскладка обзора в две колонки (`lg+`)

Требования: §6 спеки. Сложность: низкая (чистая раскладка, без данных). Финальная полировка
десктопа — отгружаем последней, поверх A/H. Без изменения загрузки (INV-L-2).

---

## Модуль 1 — реструктуризация `src/features/students/student-overview.tsx`

Текущий обзор — один вертикальный поток (`space-y-6`): KPI-плитки (3) → контакты → ссылка →
активность. После A/H туда добавлена зона внимания и next-lesson получил CTA. Теперь
раскладываем поток в две колонки на `lg+`, мобайл-ферст — один столбец.

```
FUNCTION StudentOverview({ studentId, student, shareUrl, homeworkToReview, lessonsLeft, overview }):
    items = buildAttentionItems({ … })            # из 01_*
    feed  = buildActivityFeed(overview.recentLessons, overview.lastPayment)

    RETURN (
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ГЛАВНАЯ КОЛОНКА — lg:col-span-2 */}
        <div className="space-y-6 lg:col-span-2">
          <AttentionZone studentId={studentId} lessonsLeft={lessonsLeft} items={items} />
          <NextLessonCard
            studentId={studentId} student={student}
            lessonsLeft={lessonsLeft} nextLesson={overview.nextLesson} />
          {feed.length > 0 ? <RecentActivity feed={feed} currency={overview.currency} /> : null}
        </div>

        {/* ASIDE — lg:col-span-1 */}
        <aside className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile label={t.students.overview.toReview} value={homeworkToReview}
                      icon={ClipboardCheck} href={`/students/${studentId}?tab=homework`} />
            <StatTile label={t.students.overview.totalPaid}
                      value={formatMoney(overview.totalPaid, overview.currency)}
                      icon={Wallet} href={`/students/${studentId}?tab=packages`} />
          </div>
          <Contacts student={student} />                    {/* 2 ContactField, как сейчас */}
          <ShareLink shareUrl={shareUrl} />                  {/* блок ссылки, как сейчас */}
        </aside>

      </div>
    )
```

Заметки:

- **Порядок DOM = порядок чтения на мобильном** (FR-L-6): grid без явного `order-*` отдаёт
  главную колонку первой, aside второй → внимание → next-lesson → активность → KPI → контакты
  → ссылка. Это приемлемый порядок чтения (EC-L-1). Если хотим KPI выше активности на мобайле —
  добавить `order-*` с осторожностью (Tab-порядок должен совпасть с визуальным, §9). Дефолт без
  `order-*` предпочтителен.
- `NextLessonCard` — вынесенная из текущей первой KPI-плитки логика next-lesson (клик →
  `LessonDetailDialog`; пусто → CTA `AddLesson` из `03_*` Модуль 4). Теперь это карточка
  главной колонки, а не плитка (FR-L-4).
- `StatTile` (to-review, paid) — без изменений по содержанию, переезжают в aside; на `sm`
  встают в 2 колонки, на `lg` (узкий aside) — в одну (`lg:grid-cols-1`).
- `Contacts`/`ShareLink`/`RecentActivity` — те же блоки, что сейчас, вынесенные в подкомпоненты
  ради читаемости (опционально; можно оставить инлайн в JSX). Содержимое не меняется (INV-L-1).
- Сетка живёт **внутри** контента вкладки overview. Шапка, витальная полоса (V) и табы — выше,
  на полную ширину, в сетку не входят (FR-L-5).

---

## Модуль 2 — другие вкладки

Не трогаем: `LessonsTab`/`PackagesTab`/`HomeworkTab` — уже одностолбцовые списки/секции
(`space-y-8`), двухколоночник им не нужен (FR-L-5).

---

## TDD-анкеры

Чистой логики нет. Проверка — ручная, визуальная, по §6 на брейкпойнтах 375/768/1024/1440
(`docs/DESIGN.md` §12: адаптив без горизонтального скролла, длинный текст ограничен по ширине).

## Чек реализации

- [ ] Обзор: `grid gap-6 lg:grid-cols-3`; главная `lg:col-span-2`, aside `lg:col-span-1`.
- [ ] Главная: внимание → next-lesson (карточка) → активность (AC-L-2).
- [ ] Aside: to-review + paid (плитки) → контакты → ссылка (AC-L-3).
- [ ] Мобайл/планшет (`< lg`): один столбец, порядок чтения FR-L-6 (AC-L-1, EC-L-1).
- [ ] Контент обзора не потерян, только перераспределён (INV-L-1).
- [ ] AC-L-4: 375/768/1024/1440 — без горизонтального скролла; светлая+тёмная тема.
- [ ] `pnpm lint` + `pnpm typecheck` зелёные.
