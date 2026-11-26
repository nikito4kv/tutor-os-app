import { CalendarRange, CheckCircle2, GraduationCap, Wallet, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DEFAULT_CURRENCY, formatMoney, isCurrencyCode } from "@/lib/currency";
import { t } from "@/lib/i18n";
import { LessonStatusChart } from "./lesson-status-chart";
import type { AdminStats, TutorAnalytics as Analytics } from "./queries";

const iconChip = "grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary";

/**
 * Сводная аналитика по одному преподавателю — как «обзор», но агрегатами: KPI
 * (ученики/уроки/проведено/доход) + донат уроков по статусам. Донат переиспользует
 * `LessonStatusChart`: подставляем в форму `AdminStats` только уроки этого репетитора.
 */
export function TutorAnalytics({
  analytics,
  currency,
}: {
  analytics: Analytics;
  currency: string;
}) {
  const cur = isCurrencyCode(currency) ? currency : DEFAULT_CURRENCY;

  const stats = {
    tutors: 0,
    students: 0,
    lessons: 0,
    feedback_new: 0,
    tutors_new_7d: 0,
    students_new_7d: 0,
    lessons_scheduled: analytics.lessonsScheduled,
    lessons_done: analytics.lessonsDone,
    lessons_canceled: analytics.lessonsCanceled,
    lessons_no_show: analytics.lessonsNoShow,
    lessons_done_7d: 0,
    tutors_no_students: 0,
    tutors_inactive_30d: 0,
  } satisfies AdminStats;

  const kpis: { label: string; value: string | number; icon: LucideIcon }[] = [
    { label: t.admin.tutorDetail.metrics.students, value: analytics.students, icon: GraduationCap },
    {
      label: t.admin.tutorDetail.metrics.lessonsTotal,
      value: analytics.lessonsTotal,
      icon: CalendarRange,
    },
    { label: t.admin.tutorDetail.metrics.done, value: analytics.lessonsDone, icon: CheckCircle2 },
    {
      label: t.admin.tutorDetail.metrics.income,
      value: formatMoney(analytics.income, cur),
      icon: Wallet,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-5">
            <span className={iconChip}>
              <Icon className="size-5" />
            </span>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
          </Card>
        ))}
      </div>

      <LessonStatusChart stats={stats} />
    </div>
  );
}
