import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { focusRing, pressable } from "@/lib/styles";
import { t } from "@/lib/i18n";

/** Sticky marketing header: brand, in-page links, auth CTAs. */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="size-6 text-primary" />
          <span className="text-lg">{t.common.appName}</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          <a
            href="#features"
            className={cn("rounded-sm transition-colors hover:text-foreground", focusRing)}
          >
            {t.landing.nav.features}
          </a>
          <a
            href="#how"
            className={cn("rounded-sm transition-colors hover:text-foreground", focusRing)}
          >
            {t.landing.nav.how}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              pressable,
              "hidden sm:inline-flex",
            )}
          >
            {t.landing.hero.ctaSecondary}
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "sm" }), pressable)}>
            {t.landing.hero.ctaPrimary}
          </Link>
        </div>
      </div>
    </header>
  );
}
