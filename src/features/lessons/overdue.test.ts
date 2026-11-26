import { describe, expect, it } from "vitest";
import { isLessonOverdue } from "./overdue";

// Reference "now": 13 Jun 2026, 15:00 local.
const NOW = new Date(2026, 5, 13, 15, 0).getTime();
const iso = (...args: [number, number, number, number?, number?]) =>
  new Date(...args).toISOString();

describe("isLessonOverdue", () => {
  it("flags a scheduled lesson in the past", () => {
    expect(isLessonOverdue({ status: "scheduled", starts_at: iso(2026, 5, 12, 18, 0) }, NOW)).toBe(
      true,
    );
  });

  it("flags a scheduled lesson earlier today", () => {
    expect(isLessonOverdue({ status: "scheduled", starts_at: iso(2026, 5, 13, 9, 0) }, NOW)).toBe(
      true,
    );
  });

  it("does not flag a scheduled lesson in the future", () => {
    expect(isLessonOverdue({ status: "scheduled", starts_at: iso(2026, 5, 14, 18, 0) }, NOW)).toBe(
      false,
    );
  });

  it("does not flag a canceled lesson in the past", () => {
    expect(isLessonOverdue({ status: "canceled", starts_at: iso(2026, 5, 12, 18, 0) }, NOW)).toBe(
      false,
    );
  });

  it("does not flag a done lesson in the past", () => {
    expect(isLessonOverdue({ status: "done", starts_at: iso(2026, 5, 12, 18, 0) }, NOW)).toBe(
      false,
    );
  });

  it("does not flag a no_show lesson in the past", () => {
    expect(isLessonOverdue({ status: "no_show", starts_at: iso(2026, 5, 12, 18, 0) }, NOW)).toBe(
      false,
    );
  });

  it("defaults `now` to the current time when omitted", () => {
    expect(isLessonOverdue({ status: "scheduled", starts_at: iso(2000, 0, 1) })).toBe(true);
  });
});
