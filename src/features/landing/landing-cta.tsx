import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { pressable } from "@/lib/styles";
import { t } from "@/lib/i18n";
import { Reveal } from "./reveal";

/** Closing conversion band. */
export function LandingCta() {
  return (
    <section className="border-t py-20 md:py-28">
      <div className="container">
        <Reveal className="mx-auto max-w-3xl rounded-2xl bg-primary px-8 py-14 text-center text-primary-foreground sm:px-14">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.cta.title}</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
            {t.landing.cta.subtitle}
          </p>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              pressable,
              "group mt-8 text-secondary-foreground",
            )}
          >
            {t.landing.cta.button}
            <ArrowRight className="transition-transform duration-200 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
