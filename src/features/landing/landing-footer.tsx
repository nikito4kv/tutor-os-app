import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { focusRing } from "@/lib/styles";
import { t } from "@/lib/i18n";

/** Minimal marketing footer. */
export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-background py-10">
      <div className="container flex flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex items-center gap-2">
          <GraduationCap className="size-5 text-primary" />
          <span className="font-semibold">{t.common.appName}</span>
          <span className="text-sm text-muted-foreground">— {t.landing.footer.tagline}</span>
        </div>

        <nav className="flex items-center gap-6 text-sm text-muted-foreground">
          <Link
            href="/login"
            className={cn("rounded-sm transition-colors hover:text-foreground", focusRing)}
          >
            {t.auth.signIn}
          </Link>
          <Link
            href="/signup"
            className={cn("rounded-sm transition-colors hover:text-foreground", focusRing)}
          >
            {t.auth.signUp}
          </Link>
        </nav>

        <p className="text-sm text-muted-foreground">
          © {year} {t.common.appName}. {t.landing.footer.rights}
        </p>
      </div>
    </footer>
  );
}
