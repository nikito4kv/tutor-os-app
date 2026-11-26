import { describe, expect, it } from "vitest";
import { isHomeworkOverdue } from "./deadline";

// Reference "now": 13 Jun 2026, 15:00 local.
const NOW = new Date(2026, 5, 13, 15, 0).getTime();
const iso = (...args: [number, number, number]) => new Date(...args).toISOString();

describe("isHomeworkOverdue", () => {
  it("is false for a future deadline", () => {
    expect(isHomeworkOverdue(iso(2026, 5, 20), "assigned", NOW)).toBe(false);
  });

  it("is true for a past deadline that isn't reviewed", () => {
    expect(isHomeworkOverdue(iso(2026, 5, 10), "submitted", NOW)).toBe(true);
  });

  it("is false for a past deadline that is already reviewed", () => {
    expect(isHomeworkOverdue(iso(2026, 5, 10), "reviewed", NOW)).toBe(false);
  });

  it("is false when there is no deadline", () => {
    expect(isHomeworkOverdue(null, "assigned", NOW)).toBe(false);
  });
});
