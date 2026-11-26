import { DelayedLoadingIndicator } from "@/components/states/delayed-loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboardLoading() {
  return (
    <>
      <DelayedLoadingIndicator />
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-48" />
        </div>

        {/* Сводка: 3 KPI-карточки. */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </div>

        {/* Уроки по статусам: hero-карточка с донатом. */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>

        {/* Активность: 3 карточки. */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
