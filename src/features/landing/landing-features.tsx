"use client";

import { motion } from "motion/react";
import {
  UserRound,
  Wallet,
  CalendarDays,
  CircleCheckBig,
  BookOpenCheck,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Reveal, REVEAL_VIEWPORT, useStaggerVariants } from "./reveal";

type Feature = { icon: LucideIcon; item: { title: string; desc: string }; span: string };

// Bento rhythm, not six identical cards. The lead tile (the student card — the
// product's core, per docs/PRODUCT.md) is wide; then two halves and three
// thirds. Exactly six cells on the lg grid, no filler.
const LEAD = {
  icon: UserRound,
  item: t.landing.features.items.student,
} as const;

const FEATURES: Feature[] = [
  { icon: Wallet, item: t.landing.features.items.balance, span: "lg:col-span-3" },
  { icon: CalendarDays, item: t.landing.features.items.schedule, span: "lg:col-span-3" },
  { icon: CircleCheckBig, item: t.landing.features.items.complete, span: "lg:col-span-2" },
  { icon: BookOpenCheck, item: t.landing.features.items.homework, span: "lg:col-span-2" },
  { icon: Share2, item: t.landing.features.items.share, span: "lg:col-span-2" },
];

/** Bento feature grid covering the accounting core of tutorOS. */
export function LandingFeatures() {
  const LeadIcon = LEAD.icon;
  const { container, item } = useStaggerVariants();

  return (
    <section id="features" className="scroll-mt-20 border-t bg-background py-20 md:py-28">
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {t.landing.features.title}
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">{t.landing.features.subtitle}</p>
        </Reveal>

        <motion.ul
          className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={REVEAL_VIEWPORT}
        >
          {/* Lead tile: tinted and airy, anchors the grid on the product's heart. */}
          <motion.li
            variants={item}
            className="rounded-2xl border border-primary/15 bg-accent p-6 sm:p-8 lg:col-span-6"
          >
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <LeadIcon className="size-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold text-accent-foreground">{LEAD.item.title}</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-accent-foreground/80">
              {LEAD.item.desc}
            </p>
          </motion.li>

          {FEATURES.map(({ icon: Icon, item: feature, span }) => (
            <motion.li
              key={feature.title}
              variants={item}
              className={cn(
                "group flex flex-col rounded-2xl border bg-card p-6 transition-colors duration-200 hover:border-primary/40 hover:bg-accent/40",
                span,
              )}
            >
              <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors duration-200 group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="size-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
