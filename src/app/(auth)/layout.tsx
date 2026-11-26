import Link from "next/link";
import { CalendarCheck, FileText, GraduationCap, Users } from "lucide-react";
import { t } from "@/lib/i18n";

const BRAND_POINTS = [
  { icon: Users, text: t.auth.brandPoints.students },
  { icon: CalendarCheck, text: t.auth.brandPoints.schedule },
  { icon: FileText, text: t.auth.brandPoints.homework },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Форма */}
      <div className="flex flex-col bg-background px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2 text-lg font-semibold text-foreground transition-colors hover:text-primary"
        >
          <GraduationCap className="size-6 text-primary" />
          {t.common.appName}
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </div>

      {/* Бренд-панель — скрыта на узких экранах */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary to-accent-foreground p-10 text-primary-foreground lg:flex">
        {/* Мягкое бирюзовое свечение — рифма с hero-подложкой лендинга. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 size-96 rounded-full bg-primary-foreground/10 blur-3xl"
        />

        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <GraduationCap className="size-6" />
          {t.common.appName}
        </div>

        <div className="relative space-y-8">
          <p className="text-2xl font-semibold leading-snug">{t.auth.brandTagline}</p>
          <ul className="space-y-4">
            {BRAND_POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Icon className="size-5" />
                </span>
                <span className="pt-1.5 text-primary-foreground/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-primary-foreground/70">{t.landing.footer.tagline}</p>
      </aside>
    </main>
  );
}
