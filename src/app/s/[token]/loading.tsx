import { DelayedLoadingIndicator } from "@/components/states/delayed-loading-indicator";
import { Skeleton } from "@/components/ui/skeleton";

export default function ShareLoading() {
  return (
    <>
      <DelayedLoadingIndicator />
      <div className="min-h-[100dvh] bg-background">
        <div className="border-b bg-gradient-to-b from-accent/40 to-background">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="size-9 rounded-md" />
          </div>
          <div className="mx-auto max-w-2xl px-4 pb-8 pt-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="size-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-7 w-40" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="space-y-2 sm:items-end">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-28" />
              </div>
            </div>
          </div>
        </div>

        <main className="mx-auto max-w-2xl space-y-8 px-4 pb-12 pt-8">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-28 w-full" />
          </div>
        </main>
      </div>
    </>
  );
}
