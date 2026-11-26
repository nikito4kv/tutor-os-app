import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";

export type ShareTabKey = "overview" | "schedule" | "chat" | "homework";

const SHARE_TABS: Array<{ key: ShareTabKey; label: string; icon: LucideIcon }> = [
  { key: "overview", label: t.students.tabs.overview, icon: LayoutDashboard },
  { key: "schedule", label: t.nav.schedule, icon: CalendarDays },
  { key: "chat", label: t.chat.title, icon: MessageCircle },
  { key: "homework", label: t.students.tabs.homework, icon: ClipboardList },
];

export function isShareTab(value: string | undefined): value is ShareTabKey {
  return SHARE_TABS.some((tab) => tab.key === value);
}

export function shareTabHref(token: string, tab: ShareTabKey) {
  return tab === "overview" ? "/s/" + token : "/s/" + token + "?tab=" + tab;
}

export function ShareTabs({
  activeTab,
  token,
  counts,
  studentName,
}: {
  activeTab: ShareTabKey;
  token: string;
  counts: Partial<Record<ShareTabKey, number>>;
  studentName: string;
}) {
  return (
    <>
      <aside className="hidden min-h-[100dvh] w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <Link
          href={shareTabHref(token, "overview")}
          aria-label={t.students.tabs.overview}
          className={cn(
            "mx-3 my-3 flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/60",
            focusRing,
          )}
        >
          <GraduationCap className="size-6 text-primary" />
          <span className="text-lg font-semibold">{t.common.appName}</span>
        </Link>

        <nav aria-label={t.share.tabsLabel} className="flex-1 space-y-1 px-3">
          {SHARE_TABS.map((tab) => {
            const active = tab.key === activeTab;
            const count = counts[tab.key] ?? 0;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.key}
                href={shareTabHref(token, tab.key)}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  focusRing,
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{tab.label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground">
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="truncate text-xs text-muted-foreground">{studentName}</p>
            <ThemeToggle className="size-8 shrink-0" />
          </div>
        </div>
      </aside>

      <nav
        aria-label={t.share.tabsLabel}
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 gap-1 rounded-lg border bg-card/95 p-1 shadow-lg shadow-foreground/10 backdrop-blur lg:hidden"
      >
        {SHARE_TABS.map((tab) => {
          const active = tab.key === activeTab;
          const count = counts[tab.key] ?? 0;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={shareTabHref(token, tab.key)}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors",
                focusRing,
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{tab.label}</span>
              {count > 0 ? (
                <span className="absolute right-1.5 top-1 rounded-full bg-secondary px-1.5 text-[10px] font-semibold tabular-nums leading-4 text-secondary-foreground">
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
