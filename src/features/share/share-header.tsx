import { AlertTriangle, GraduationCap, WalletCards } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LOW_BALANCE_THRESHOLD } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import { revealUp } from "@/lib/styles";
import { t } from "@/lib/i18n";

/**
 * Branded header for the public student/parent page. Desktop is aligned to the
 * app shell content grid; mobile keeps the tutorOS top bar visible like the main
 * app layout.
 */
export function ShareHeader({
  studentName,
  subject,
  tutorName,
  lessonsLeft,
}: {
  studentName: string;
  subject: string | null;
  tutorName: string | null;
  lessonsLeft: number;
}) {
  const low = lessonsLeft <= LOW_BALANCE_THRESHOLD;
  const warning = lessonsLeft === 0 ? t.share.lowBalanceZero : t.students.lowBalance;
  const meta = [subject, tutorName ? `${t.share.tutorLabel}: ${tutorName}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="bg-background">
      <div className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <span className="flex min-w-0 items-center gap-2 rounded-md py-2 pr-2">
          <GraduationCap className="size-6 shrink-0 text-primary" />
          <span className="truncate text-lg font-semibold">{t.common.appName}</span>
        </span>
        <ThemeToggle className="size-9 shrink-0" />
      </div>

      <div className={cn("mx-auto max-w-5xl px-4 pb-2 pt-20 lg:px-8 lg:pt-10 xl:px-10", revealUp)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden
              className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary"
            >
              {initials(studentName)}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold">{studentName}</h1>
              {meta ? <p className="truncate text-muted-foreground">{meta}</p> : null}
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 lg:min-w-64 lg:max-w-xs lg:translate-y-1">
            <div className="flex items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <WalletCards className="size-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.share.balanceLabel}</p>
                  <p className="text-sm text-muted-foreground">{t.students.lessonsLeft}</p>
                </div>
              </div>
              <span className="shrink-0 text-3xl font-semibold tabular-nums">{lessonsLeft}</span>
            </div>

            {low ? (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-warning/15 px-3 py-2 text-sm font-medium text-warning">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{warning}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
