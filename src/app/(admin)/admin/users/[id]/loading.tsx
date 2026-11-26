import { DelayedLoadingIndicator } from "@/components/states/delayed-loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminTutorLoading() {
  return (
    <>
      <DelayedLoadingIndicator />
      <div className="space-y-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-36 w-full" />
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
