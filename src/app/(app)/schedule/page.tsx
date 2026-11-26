import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { listLessonsInRange, type LessonWithStudent } from "@/features/lessons/queries";
import { listStudentOptions } from "@/features/students/queries";
import { AddLesson } from "@/features/lessons/add-lesson";
import { WeekCalendar } from "@/features/lessons/week-calendar";
import { MonthCalendar } from "@/features/lessons/month-calendar";
import { LessonList } from "@/features/lessons/lesson-list";
import { EmptyState } from "@/components/states/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import {
  addDays,
  addMonths,
  formatDayLabel,
  formatMonthLabel,
  isSameDay,
  monthRange,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  toDateKey,
  weekRange,
} from "@/lib/date";

type View = "week" | "list" | "month";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; week?: string; month?: string; day?: string }>;
}) {
  const { view: viewParam, week: weekParam, month: monthParam, day: dayParam } = await searchParams;
  const view: View = viewParam === "list" ? "list" : viewParam === "month" ? "month" : "week";

  const today = new Date();
  // Parse `?week=` as local midnight so week math stays in the runtime's zone.
  const parsedWeek = parseDateKey(weekParam) ?? today;
  const weekStart = startOfWeek(parsedWeek);
  const selectedDay = parseDateKey(dayParam);
  const monthStart = startOfMonth(parseDateKey(monthParam) ?? selectedDay ?? today);
  const range = view === "month" ? monthRange(monthStart) : weekRange(weekStart);

  const [lessons, studentOptions] = await Promise.all([
    listLessonsInRange(range.from, range.to),
    listStudentOptions(),
  ]);

  // Merge in student names from the already-loaded list (no extra query/join).
  const nameById = new Map(studentOptions.map((s) => [s.id, s.name]));
  const lessonsWithStudent: LessonWithStudent[] = lessons.map((l) => ({
    ...l,
    student: { name: nameById.get(l.student_id) ?? "—" },
  }));

  const weekKey = toDateKey(weekStart);
  const prevKey = toDateKey(addDays(weekStart, -7));
  const nextKey = toDateKey(addDays(weekStart, 7));
  const monthKey = toDateKey(monthStart);
  const prevMonthKey = toDateKey(addMonths(monthStart, -1));
  const nextMonthKey = toDateKey(addMonths(monthStart, 1));
  const currentMonthKey = toDateKey(startOfMonth(today));
  const rangeLabel = `${formatDayLabel(weekStart)} — ${formatDayLabel(addDays(weekStart, 6))}`;
  const monthLabel = formatMonthLabel(monthStart);
  const selectedDayLessons = selectedDay
    ? lessonsWithStudent.filter((lesson) => isSameDay(new Date(lesson.starts_at), selectedDay))
    : [];
  const periodTitle = selectedDay
    ? formatDayLabel(selectedDay)
    : view === "month"
      ? monthLabel
      : rangeLabel;
  const dayBackHref =
    view === "month"
      ? `/schedule?view=month&month=${monthKey}`
      : `/schedule?view=week&week=${weekKey}`;
  const dayBackLabel = view === "month" ? t.lessons.backToMonth : t.lessons.backToWeek;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t.nav.schedule}</h1>
        <AddLesson
          students={studentOptions}
          defaultDate={selectedDay ? toDateKey(selectedDay) : undefined}
        />
      </div>

      <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
        {/* View toggle — компактный (по содержимому), как в десктопной версии. */}
        <div className="flex w-fit gap-1 rounded-md border p-1">
          <ViewTab
            label={t.lessons.views.week}
            href={`/schedule?view=week&week=${weekKey}`}
            active={view === "week"}
          />
          <ViewTab
            label={t.lessons.views.list}
            href={`/schedule?view=list&week=${weekKey}`}
            active={view === "list"}
          />
          <ViewTab
            label={t.lessons.views.month}
            href={`/schedule?view=month&month=${monthKey}`}
            active={view === "month"}
          />
        </div>

        <h2 className="text-center text-xl font-semibold text-foreground md:text-2xl">
          {periodTitle}
        </h2>

        {/* Period navigation */}
        {view === "month" ? (
          <div className="flex w-full items-center justify-center gap-2 sm:w-[13rem] lg:justify-self-end">
            <Link
              href={`/schedule?view=month&month=${prevMonthKey}`}
              aria-label={t.lessons.prevMonth}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`/schedule?view=month&month=${currentMonthKey}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t.lessons.thisMonth}
            </Link>
            <Link
              href={`/schedule?view=month&month=${nextMonthKey}`}
              aria-label={t.lessons.nextMonth}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 sm:w-[13rem] lg:justify-self-end">
            <Link
              href={`/schedule?view=${view}&week=${prevKey}`}
              aria-label={t.lessons.prevWeek}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`/schedule?view=${view}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {t.lessons.thisWeek}
            </Link>
            <Link
              href={`/schedule?view=${view}&week=${nextKey}`}
              aria-label={t.lessons.nextWeek}
              className={cn(buttonVariants({ variant: "outline", size: "icon" }))}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        )}
      </div>

      {(view === "month" || view === "week") && selectedDay ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href={dayBackHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              <ChevronLeft className="size-4" />
              {dayBackLabel}
            </Link>
          </div>
          {selectedDayLessons.length === 0 ? (
            <EmptyState icon={<CalendarDays className="size-6" />} title={t.lessons.emptyDay} />
          ) : (
            <LessonList lessons={selectedDayLessons} showStudent />
          )}
        </div>
      ) : view === "month" ? (
        <MonthCalendar monthStart={monthStart} today={today} lessons={lessonsWithStudent} />
      ) : lessons.length === 0 ? (
        <EmptyState icon={<CalendarDays className="size-6" />} title={t.lessons.emptyWeek} />
      ) : view === "week" ? (
        <WeekCalendar weekStart={weekStart} today={today} lessons={lessonsWithStudent} />
      ) : (
        <LessonList lessons={lessonsWithStudent} showStudent />
      )}
    </div>
  );
}

function ViewTab({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded px-3 py-1 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}
