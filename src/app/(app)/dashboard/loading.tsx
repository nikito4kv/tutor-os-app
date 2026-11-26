import { DelayedLoadingIndicator } from "@/components/states/delayed-loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CardSkeleton,
  InboxSkeleton,
  LowBalanceSkeleton,
  MonthIncomeSkeleton,
  NextLessonSkeleton,
} from "@/features/dashboard/skeletons";

export default function DashboardLoading() {
  return (
    <>
      <DelayedLoadingIndicator />
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <NextLessonSkeleton />
          </div>
          <MonthIncomeSkeleton />
        </div>
        <CardSkeleton />
        <InboxSkeleton />
        <LowBalanceSkeleton />
      </div>
    </>
  );
}
