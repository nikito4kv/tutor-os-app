"use client";

import { motion } from "motion/react";
import { t } from "@/lib/i18n";
import { Reveal, REVEAL_VIEWPORT, useStaggerVariants } from "./reveal";

const STEPS = [
  t.landing.steps.items.add,
  t.landing.steps.items.plan,
  t.landing.steps.items.finish,
  t.landing.steps.items.link,
];

/** Numbered "how it works" walkthrough — a hairline-topped step rail. */
export function LandingSteps() {
  const { container, item } = useStaggerVariants();

  return (
    <section id="how" className="scroll-mt-20 border-t bg-secondary/40 py-20 md:py-28">
      <div className="container">
        <Reveal className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.landing.steps.title}</h2>
          <p className="mt-4 text-lg text-muted-foreground">{t.landing.steps.subtitle}</p>
        </Reveal>

        <motion.ol
          className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4"
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={REVEAL_VIEWPORT}
        >
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              variants={item}
              className="border-t-2 border-primary/20 pt-5"
            >
              <span className="block text-3xl font-bold tabular-nums text-primary">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
