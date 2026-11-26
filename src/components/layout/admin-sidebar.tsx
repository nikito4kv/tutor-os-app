"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LayoutDashboard, MessageSquare, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/features/auth/actions";

const NAV = [
  { href: "/admin", label: t.admin.nav.overview, icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: t.admin.nav.users, icon: Users, exact: false },
  { href: "/admin/feedback", label: t.admin.nav.feedback, icon: MessageSquare, exact: false },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between border-b bg-card/95 px-4 backdrop-blur lg:hidden">
        <Link
          href="/admin"
          aria-label={t.admin.title}
          className={cn("flex min-w-0 items-center gap-2 rounded-md py-2 pr-2", focusRing)}
        >
          <GraduationCap className="size-6 shrink-0 text-primary" />
          <span className="truncate text-lg font-semibold">{t.common.appName}</span>
          <span className="shrink-0 text-xs font-medium text-muted-foreground">admin</span>
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
          href="/admin"
          aria-label={t.admin.title}
          className={cn(
            "mx-3 my-3 flex items-center gap-2 rounded-md px-2 py-2 transition-colors hover:bg-accent/60",
            focusRing,
          )}
        >
          <GraduationCap className="size-6 text-primary" />
          <span className="text-lg font-semibold">{t.common.appName}</span>
          <span className="text-xs font-medium text-muted-foreground">admin</span>
        </Link>

        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  focusRing,
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <p className="truncate text-xs text-muted-foreground">{t.admin.title}</p>
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

      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 gap-1 rounded-lg border bg-card/95 p-1 shadow-lg shadow-foreground/10 backdrop-blur lg:hidden">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-medium transition-colors",
                focusRing,
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="max-w-full truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
