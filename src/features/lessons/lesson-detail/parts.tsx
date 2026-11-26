import { Skeleton } from "@/components/ui/skeleton";
import { t } from "@/lib/i18n";

/** The four faces of the lesson modal. */
export type Mode = "view" | "edit" | "reschedule" | "complete";

/** Destructive/state-changing actions that ask for confirmation first. */
export type Confirmable = "cancel" | "delete" | "noShow" | "reopen";

/** Low-balance / no-active-package warning banner (shared by complete + no-show). */
export function LowBalanceBanner({ lessonsLeft }: { lessonsLeft: number }) {
  return (
    <div className="rounded-md border border-warning/30 bg-warning/15 p-3 text-sm text-warning">
      {lessonsLeft <= 0 ? t.lessons.noActivePackage : t.lessons.lowBalanceAlert}{" "}
      <span className="font-medium">
        {t.lessons.lessonsLeftShort} {lessonsLeft}
      </span>
    </div>
  );
}

/** Fallback while a lazily-loaded mode's chunk resolves; sized close to a form. */
export function ModeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="ml-auto h-9 w-1/3" />
    </div>
  );
}
