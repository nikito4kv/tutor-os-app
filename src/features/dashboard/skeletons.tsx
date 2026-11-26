import { Skeleton } from "@/components/ui/skeleton";

// Per-card fallbacks, shared by the page's <Suspense> boundaries and the
// route-level loading.tsx so both render the same shape.

export function NextLessonSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

export function MonthIncomeSkeleton() {
  return <Skeleton className="h-40 w-full" />;
}

/** Today's lessons card footprint. */
export function CardSkeleton() {
  return <Skeleton className="h-64 w-full" />;
}

/** Action inbox: heading + three category columns. */
export function InboxSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-7 w-44" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export function LowBalanceSkeleton() {
  return <Skeleton className="h-24 w-full" />;
}
