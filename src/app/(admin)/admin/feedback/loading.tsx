import { DelayedLoadingIndicator } from "@/components/states/delayed-loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminFeedbackLoading() {
  return (
    <>
      <DelayedLoadingIndicator />
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-full max-w-md" />
        <div className="space-y-px rounded-md border p-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    </>
  );
}
