import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pressable, revealUp } from "@/lib/styles";
import { t } from "@/lib/i18n";

/** Hero: value proposition, primary/secondary CTAs and a product mock-up. */
export function LandingHero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft brand wash behind the hero — semantic tokens only, no raw hex. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-gradient-to-b from-accent/60 to-background"
      />

      <div className="container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2 lg:gap-16">
        <div className="max-w-xl">
          <span
            className={cn(
              "inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary",
              revealUp,
            )}
          >
            {t.landing.hero.badge}
          </span>

          <h1
            className={cn(
              "mt-6 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl",
              revealUp,
              "delay-75",
            )}
          >
            {t.landing.hero.title}
          </h1>

          <p
            className={cn(
              "mt-5 text-lg leading-relaxed text-muted-foreground",
              revealUp,
              "delay-150",
            )}
          >
            {t.landing.hero.subtitle}
          </p>

          <div className={cn("mt-8 flex flex-col gap-3 sm:flex-row", revealUp, "delay-200")}>
            <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), pressable, "group")}>
              {t.landing.hero.ctaPrimary}
              <ArrowRight className="transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), pressable)}
            >
              {t.landing.hero.ctaSecondary}
            </Link>
          </div>

          <p className={cn("mt-4 text-sm text-muted-foreground", revealUp, "delay-200")}>
            {t.landing.hero.note}
          </p>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}

/** Decorative faux student-card preview — mirrors the real product UI. */
function HeroMockup() {
  const m = t.landing.mockup;
  return (
    <div className={cn("relative mx-auto w-full max-w-md", revealUp, "delay-150")}>
      {/* Tinted backdrop card for depth — token-based, clipped by the hero's overflow. */}
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rotate-2 rounded-2xl border border-primary/10 bg-accent/60"
      />
      <div className="rounded-xl border bg-card p-6 shadow-xl shadow-foreground/5">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-full bg-accent text-base font-semibold text-accent-foreground">
            {m.studentInitials}
          </div>
          <div>
            <p className="font-semibold leading-tight">{m.studentName}</p>
            <p className="text-sm text-muted-foreground">{m.caption}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg border bg-secondary/50 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{t.students.balance}</span>
            <span className="text-sm text-muted-foreground">
              <span className="text-lg font-semibold text-foreground">5</span> {m.lessonsLeft}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full w-[62%] rounded-full bg-primary" />
          </div>
        </div>

        <ul className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-3 rounded-lg border p-3">
            <CalendarDays className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-muted-foreground">{m.nextLesson}</p>
              <p className="truncate font-medium">{m.nextLessonValue}</p>
            </div>
          </li>
          <li className="flex items-center gap-3 rounded-lg border p-3">
            <CheckCircle2 className="size-5 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-muted-foreground">{m.homework}</p>
              <p className="truncate font-medium">{m.homeworkValue}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
