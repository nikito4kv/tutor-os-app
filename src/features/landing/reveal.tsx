"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";

// One motion voice for the landing: the same strong ease-out baked into
// `revealUp` (src/lib/styles.ts), so CSS load-reveals and JS scroll-reveals match.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// Fire once, slightly before the block is fully in view.
export const REVEAL_VIEWPORT = { once: true, margin: "-80px" } as const;

/**
 * Fade + 16px rise the first time a block scrolls into view. Honors
 * prefers-reduced-motion (renders in place, no transform). Client leaf — keep
 * page sections server-rendered and wrap only the content that should settle in.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={REVEAL_VIEWPORT}
      transition={{ duration: 0.5, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Variants for a list that staggers its items into view. Put `container` on the
 * motion <ul>/<ol> (with `initial="hidden" whileInView="show"`) and `item` on
 * each motion <li>. Reduced motion collapses both to a no-op (items in place).
 */
export function useStaggerVariants(): { container: Variants; item: Variants } {
  const reduce = useReducedMotion();
  if (reduce) {
    return {
      container: { hidden: {}, show: {} },
      item: { hidden: { opacity: 1 }, show: { opacity: 1 } },
    };
  }
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
    },
    item: {
      hidden: { opacity: 0, y: 16 },
      show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
    },
  };
}
