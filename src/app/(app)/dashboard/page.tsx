import { Suspense } from "react";
import { NextLessonLoader } from "@/features/dashboard/loaders/next-lesson-loader";
import { MonthIncomeLoader } from "@/features/dashboard/loaders/month-income-loader";
import { TodayLessonsLoader } from "@/features/dashboard/loaders/today-lessons-loader";
import { InboxLoader } from "@/features/dashboard/loaders/inbox-loader";
import { LowBalanceLoader } from "@/features/dashboard/loaders/low-balance-loader";
import {
  CardSkeleton,
  InboxSkeleton,
  LowBalanceSkeleton,
  MonthIncomeSkeleton,
  NextLessonSkeleton,
} from "@/features/dashboard/skeletons";
import { t } from "@/lib/i18n";

// Operational cockpit — data is "as of now", so never cache the render. Each
// card streams in independently via <Suspense> as its own query resolves, so
// the shell paints immediately and a slow query can't block the rest.
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.welcome}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<NextLessonSkeleton />}>
            <NextLessonLoader />
          </Suspense>
        </div>
        <Suspense fallback={<MonthIncomeSkeleton />}>
          <MonthIncomeLoader />
        </Suspense>
      </div>

      <Suspense fallback={<CardSkeleton />}>
        <TodayLessonsLoader />
      </Suspense>

      <Suspense fallback={<InboxSkeleton />}>
        <InboxLoader />
      </Suspense>

      <Suspense fallback={<LowBalanceSkeleton />}>
        <LowBalanceLoader />
      </Suspense>
    </div>
  );
}
