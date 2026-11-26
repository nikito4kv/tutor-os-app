/**
 * Shared className fragments. Keep visual primitives here so the same focus
 * ring / interaction styles are reused instead of re-typed. See docs/DESIGN.md.
 */

/**
 * Keyboard focus ring — identical to the one baked into `buttonVariants`.
 * Apply to interactive elements that are NOT the Button primitive: nav links,
 * tab links, anchors. Compose with `cn(...)`.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * One-time entrance: fade + an 8px rise on a strong ease-out curve. For content
 * that should settle in rather than snap (e.g. the public student page, opened
 * cold from a chat). Compose with a `delay-*` utility to stagger siblings.
 * Collapses to an instant render under `prefers-reduced-motion`.
 */
export const revealUp =
  "animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-500 " +
  "[animation-timing-function:cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none";

/**
 * Press feedback for pressable elements that are NOT the Button primitive
 * (anchors styled as buttons, custom triggers): a subtle scale-down on `:active`
 * so the element feels like it heard the tap. Transitions colour + transform on a
 * quick ease-out; the global reduced-motion rule makes the press instant.
 */
export const pressable =
  "transition-[color,background-color,border-color,transform] duration-150 " +
  "[transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]";
