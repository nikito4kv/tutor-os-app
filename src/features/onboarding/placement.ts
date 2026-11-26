/**
 * Pure geometry for the onboarding coachmark card. No DOM access here — the
 * component measures the target element and the rendered card, then calls
 * {@link computePlacement} to decide where the card and its arrow go.
 *
 * Keeping this side-effect-free makes the tricky positioning math unit-testable
 * (see placement.test.ts) and keeps the React component focused on rendering.
 */

/** Where the card sits relative to the target. `dock` = no anchor (mobile / off-screen target). */
export type Placement = "top" | "bottom" | "left" | "right" | "dock";

/** A viewport-relative box, shaped like the slice of DOMRect we use. */
export type Box = {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

export type Size = { width: number; height: number };
export type Viewport = { width: number; height: number };

/**
 * Arrow (beak) position, expressed as an offset along the card edge that faces
 * the target. `side` is the card side the arrow attaches to. `null` arrow means
 * "do not render" (dock mode, or target missing).
 */
export type ArrowPosition = {
  side: Exclude<Placement, "dock">;
  /** Offset from the card's left edge — set for top/bottom placement. */
  left?: number;
  /** Offset from the card's top edge — set for left/right placement. */
  top?: number;
};

export type CardLayout = {
  placement: Placement;
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  arrow: ArrowPosition | null;
};

export type PlacementOptions = {
  /** Minimum distance kept between the card and the viewport edges. */
  margin: number;
  /** Gap between the target box and the card. */
  gap: number;
  /** Size of the square arrow (also reserved as extra space when choosing a side). */
  arrowSize: number;
  /** Max card width when anchored to a target. */
  maxWidth: number;
  /** Max card width when docked centred (no target on screen, desktop). */
  dockMaxWidth: number;
  /** Below this viewport width the card always docks to the bottom. */
  mobileBreakpoint: number;
  /** Keep the arrow this far from the card's rounded corners. */
  cornerRadius: number;
  /** Extra bottom clearance in dock mode so the card never hides the support FAB. */
  dockBottomGap: number;
};

export const DEFAULT_PLACEMENT_OPTIONS: PlacementOptions = {
  margin: 16,
  gap: 12,
  arrowSize: 10,
  maxWidth: 360,
  dockMaxWidth: 420,
  mobileBreakpoint: 480,
  cornerRadius: 12,
  dockBottomGap: 72,
};

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Decide where the coachmark card goes.
 *
 * Anchored mode (desktop, target on screen): pick the first side with enough
 * room in priority order bottom → top → right → left; if none fits, fall back to
 * the side with the most space and let the card scroll internally. The result is
 * always clamped fully inside the viewport on both axes using the *measured* card
 * height, which is what keeps the footer buttons from sliding off-screen.
 *
 * Dock mode (narrow viewport, or no target found): a bottom sheet (full width on
 * mobile, centred fixed-width on desktop) with no arrow.
 *
 * `card` may be `null` before the first measurement — horizontal placement is
 * still correct (width is known up front); vertical placement settles once the
 * height is measured.
 */
export function computePlacement(
  target: Box | null,
  card: Size | null,
  viewport: Viewport,
  options: PlacementOptions = DEFAULT_PLACEMENT_OPTIONS,
): CardLayout {
  const { margin, gap, arrowSize, maxWidth, dockMaxWidth, mobileBreakpoint, cornerRadius } =
    options;

  const maxHeight = Math.max(0, viewport.height - margin * 2);
  const cardHeight = Math.min(card?.height ?? 0, maxHeight);
  const isMobile = viewport.width < mobileBreakpoint;

  // ── Dock mode: mobile, or the target is not on this page ──────────────────
  if (isMobile || !target) {
    const centred = !isMobile; // desktop "no target" → centred sheet; mobile → full width
    const width = centred
      ? Math.min(dockMaxWidth, Math.max(0, viewport.width - margin * 2))
      : Math.max(0, viewport.width - margin * 2);
    const left = centred ? (viewport.width - width) / 2 : margin;

    // By default the sheet sits at the bottom (with clearance for the support FAB).
    const bottomTop = clamp(
      viewport.height - cardHeight - (margin + options.dockBottomGap),
      margin,
      Math.max(margin, viewport.height - cardHeight - margin),
    );

    // On mobile, if the highlighted target is in the bottom half of the screen,
    // dock the card to the TOP instead — otherwise the bottom sheet would cover the
    // very button the user must tap (the card is opaque and can't be tapped through).
    const targetInBottomHalf =
      isMobile && target ? target.top + target.height / 2 > viewport.height / 2 : false;
    const top = targetInBottomHalf ? margin : bottomTop;

    return { placement: "dock", left, top, width, maxHeight, arrow: null };
  }

  // ── Anchored mode ─────────────────────────────────────────────────────────
  const width = Math.min(maxWidth, viewport.width - margin * 2);

  const spaceBelow = viewport.height - target.bottom - gap;
  const spaceAbove = target.top - gap;
  const spaceRight = viewport.width - target.right - gap;
  const spaceLeft = target.left - gap;

  const neededVertical = cardHeight + arrowSize;
  const neededHorizontal = width + arrowSize;

  let side: Exclude<Placement, "dock">;
  if (spaceBelow >= neededVertical) side = "bottom";
  else if (spaceAbove >= neededVertical) side = "top";
  else if (spaceRight >= neededHorizontal) side = "right";
  else if (spaceLeft >= neededHorizontal) side = "left";
  else side = spaceBelow >= spaceAbove ? "bottom" : "top"; // tightest fit: most room + internal scroll

  let left: number;
  let top: number;
  let arrow: ArrowPosition;

  if (side === "bottom" || side === "top") {
    const targetCentreX = target.left + target.width / 2;
    left = clamp(
      targetCentreX - width / 2,
      margin,
      Math.max(margin, viewport.width - width - margin),
    );
    const rawTop =
      side === "bottom"
        ? target.bottom + gap + arrowSize
        : target.top - gap - arrowSize - cardHeight;
    top = clamp(rawTop, margin, Math.max(margin, viewport.height - cardHeight - margin));
    const arrowLeft = clamp(
      targetCentreX - left,
      cornerRadius + arrowSize,
      Math.max(cornerRadius + arrowSize, width - cornerRadius - arrowSize),
    );
    arrow = { side, left: arrowLeft };
  } else {
    const targetCentreY = target.top + target.height / 2;
    top = clamp(
      targetCentreY - cardHeight / 2,
      margin,
      Math.max(margin, viewport.height - cardHeight - margin),
    );
    const rawLeft =
      side === "right" ? target.right + gap + arrowSize : target.left - gap - arrowSize - width;
    left = clamp(rawLeft, margin, Math.max(margin, viewport.width - width - margin));
    const arrowTop = clamp(
      targetCentreY - top,
      cornerRadius + arrowSize,
      Math.max(cornerRadius + arrowSize, cardHeight - cornerRadius - arrowSize),
    );
    arrow = { side, top: arrowTop };
  }

  return { placement: side, left, top, width, maxHeight, arrow };
}
