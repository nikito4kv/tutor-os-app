import { describe, expect, it } from "vitest";
import {
  computePlacement,
  DEFAULT_PLACEMENT_OPTIONS as O,
  type Box,
  type Size,
  type Viewport,
} from "./placement";

function box(left: number, top: number, width: number, height: number): Box {
  return { left, top, width, height, right: left + width, bottom: top + height };
}

const card: Size = { width: 360, height: 260 };
const desktop: Viewport = { width: 1280, height: 800 };

describe("computePlacement — anchored sides", () => {
  it("places below the target when there is room", () => {
    const layout = computePlacement(box(100, 100, 200, 40), card, desktop);
    expect(layout.placement).toBe("bottom");
    // Centred under the target, then clamped into the viewport.
    expect(layout.left).toBe(20); // 200 (centre) - 180 (half width)
    expect(layout.top).toBe(162); // 140 (bottom) + 12 (gap) + 10 (arrow)
    expect(layout.width).toBe(360);
    expect(layout.arrow).toEqual({ side: "bottom", left: 180 });
  });

  it("flips above the target when there is no room below", () => {
    const layout = computePlacement(box(100, 720, 200, 40), card, desktop);
    expect(layout.placement).toBe("top");
    expect(layout.top).toBe(438); // 720 - 12 - 10 - 260
    expect(layout.arrow?.side).toBe("top");
  });

  it("places to the right when neither below nor above fits", () => {
    // Short-ish viewport so vertical space is tight but the card still fits.
    const short: Viewport = { width: 1280, height: 320 };
    const layout = computePlacement(box(100, 140, 40, 40), card, short);
    expect(layout.placement).toBe("right");
    expect(layout.left).toBe(162); // 140 (target right) + 12 (gap) + 10 (arrow)
    expect(layout.arrow?.side).toBe("right");
    expect(layout.arrow?.top).toBeTypeOf("number");
  });

  it("places to the left when the target hugs the right edge", () => {
    const short: Viewport = { width: 1280, height: 320 };
    const layout = computePlacement(box(1100, 140, 40, 40), card, short);
    expect(layout.placement).toBe("left");
    expect(layout.left).toBe(718); // 1100 - 12 - 10 - 360
    expect(layout.arrow?.side).toBe("left");
  });
});

describe("computePlacement — viewport clamping", () => {
  it("clamps a left-edge target and pins the arrow near the corner", () => {
    const layout = computePlacement(box(0, 100, 40, 40), card, desktop);
    expect(layout.left).toBe(O.margin); // can't go past the left margin
    expect(layout.arrow?.left).toBe(O.cornerRadius + O.arrowSize); // arrow pinned: 22
  });

  it("clamps a right-edge target and pins the arrow near the far corner", () => {
    const layout = computePlacement(box(1240, 100, 40, 40), card, desktop);
    expect(layout.left).toBe(desktop.width - 360 - O.margin); // 904
    expect(layout.arrow?.left).toBe(360 - O.cornerRadius - O.arrowSize); // 338
  });

  it("keeps the footer on-screen for a tall card (top + height ≤ viewport − margin)", () => {
    const short: Viewport = { width: 1280, height: 600 };
    const tall: Size = { width: 360, height: 568 }; // == maxHeight (600 - 32)
    const layout = computePlacement(box(100, 100, 200, 40), tall, short);
    expect(layout.top).toBe(O.margin);
    expect(layout.top + tall.height).toBe(short.height - O.margin); // exactly flush, fully visible
  });
});

describe("computePlacement — dock mode", () => {
  it("docks centred on desktop when there is no target", () => {
    const layout = computePlacement(null, { width: 360, height: 500 }, desktop);
    expect(layout.placement).toBe("dock");
    expect(layout.arrow).toBeNull();
    expect(layout.width).toBe(O.dockMaxWidth); // 420
    expect(layout.left).toBe((desktop.width - 420) / 2); // 430
  });

  it("docks full-width on a mobile viewport even when a target exists", () => {
    const mobile: Viewport = { width: 375, height: 700 };
    const layout = computePlacement(box(10, 10, 60, 36), { width: 300, height: 260 }, mobile);
    expect(layout.placement).toBe("dock");
    expect(layout.arrow).toBeNull();
    expect(layout.left).toBe(O.margin);
    expect(layout.width).toBe(mobile.width - O.margin * 2); // 343
  });

  it("docks to the TOP on mobile when the target is in the bottom half (no overlap)", () => {
    const mobile: Viewport = { width: 375, height: 700 };
    // Target near the bottom (centre y = 618 > 350) — a bottom sheet would cover it.
    const layout = computePlacement(box(20, 600, 120, 36), { width: 300, height: 260 }, mobile);
    expect(layout.placement).toBe("dock");
    expect(layout.top).toBe(O.margin); // pinned to the top edge instead
    expect(layout.top + 260).toBeLessThan(600); // card sits clear above the target
  });

  it("keeps the bottom dock on mobile when the target is in the top half", () => {
    const mobile: Viewport = { width: 375, height: 700 };
    const layout = computePlacement(box(20, 40, 120, 36), { width: 300, height: 260 }, mobile);
    expect(layout.placement).toBe("dock");
    expect(layout.top).toBe(mobile.height - 260 - (O.margin + O.dockBottomGap));
  });

  it("leaves bottom clearance for the support FAB", () => {
    const layout = computePlacement(null, { width: 360, height: 200 }, desktop);
    expect(layout.top).toBe(desktop.height - 200 - (O.margin + O.dockBottomGap));
  });
});

describe("computePlacement — robustness", () => {
  it("returns sane numbers before the card is measured (card = null)", () => {
    const layout = computePlacement(box(100, 100, 200, 40), null, desktop);
    expect(layout.placement).toBe("bottom");
    expect(Number.isFinite(layout.left)).toBe(true);
    expect(Number.isFinite(layout.top)).toBe(true);
    expect(layout.width).toBe(360);
  });
});
