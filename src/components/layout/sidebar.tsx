"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  CalendarDays,
  Settings,
  MessageCircle,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/features/auth/actions";

const NAV = [
  { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, target: "nav-overview" },
  { href: "/students", label: t.nav.students, icon: Users, target: "nav-students" },
  { href: "/schedule", label: t.nav.schedule, icon: CalendarDays, target: "nav-schedule" },
  { href: "/messages", label: t.nav.messages, icon: MessageCircle, target: "nav-messages" },
  { href: "/settings", label: t.nav.settings, icon: Settings, target: "nav-settings" },
] as const;

function formatBadgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

export function Sidebar({
  tutorName,
  unreadChatCount,
}: {
  tutorName: string;
  unreadChatCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("tutor-sidebar-chat-refresh")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_message",
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Link
          href="/dashboard"
          aria-label={t.nav.dashboard}
          className={cn("flex min-w-0 items-center gap-2 rounded-md py-2 pr-2", focusRing)}
        >
          <GraduationCap className="size-6 shrink-0 text-primary" />
          <span className="truncate text-lg font-semibold">{t.common.appName}</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle className="size-9 shrink-0" />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="icon" aria-label={t.auth.signOut}>
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </header>

      <aside className="hidden h-full w-60 shrink-0 flex-col border-r bg-card lg:flex">
        <Link
          href="/dashboard"
          aria-label={t.nav.dashboard}
          className={cn(
            "mx-3 my-3 flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/60",
            focusRing,
          )}
        >
          <GraduationCap className="size-6 text-primary" />
          <span className="text-lg font-semibold">{t.common.appName}</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon, target }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const count = href === "/messages" ? (unreadChatCount ?? 0) : 0;

            return (
              <Link
                key={href}
                href={href}
                data-onboarding-target={target}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  focusRing,
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {count > 0 ? (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-secondary-foreground">
                    {formatBadgeCount(count)}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="truncate text-xs text-muted-foreground">{tutorName}</p>
            <ThemeToggle className="size-8 shrink-0" />
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut className="size-4" />
              {t.auth.signOut}
            </Button>
          </form>
        </div>
      </aside>

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 gap-1 rounded-lg border bg-card/95 p-1 shadow-lg shadow-foreground/10 backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon, target }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const count = href === "/messages" ? (unreadChatCount ?? 0) : 0;

          return (
            <Link
              key={href}
              href={href}
              data-onboarding-target={target}
              className={cn(
                "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors",
                focusRing,
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{label}</span>
              {count > 0 ? (
                <span className="absolute right-1 top-1 rounded-full bg-secondary px-1.5 text-[10px] font-semibold tabular-nums leading-4 text-secondary-foreground">
                  {formatBadgeCount(count)}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
