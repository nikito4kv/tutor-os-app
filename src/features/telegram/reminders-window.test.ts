import { describe, expect, it } from "vitest";
import { dueForReminder } from "./reminders-window";

const NOW = Date.parse("2026-06-17T12:00:00Z");
const hoursFromNow = (h: number) => new Date(NOW + h * 3_600_000).toISOString();

describe("dueForReminder — 2h window (0, 2]", () => {
  it("fires for a lesson 1h out", () => {
    expect(dueForReminder(hoursFromNow(1), NOW, 2, 0)).toBe(true);
  });
  it("fires exactly at the 2h edge (inclusive upper bound)", () => {
    expect(dueForReminder(hoursFromNow(2), NOW, 2, 0)).toBe(true);
  });
  it("does not fire for a lesson 2.5h out", () => {
    expect(dueForReminder(hoursFromNow(2.5), NOW, 2, 0)).toBe(false);
  });
  it("does not fire for a lesson already started (exclusive lower bound)", () => {
    expect(dueForReminder(hoursFromNow(0), NOW, 2, 0)).toBe(false);
    expect(dueForReminder(hoursFromNow(-1), NOW, 2, 0)).toBe(false);
  });
});

describe("dueForReminder — 24h window (2, 24]", () => {
  it("fires for a lesson 10h out", () => {
    expect(dueForReminder(hoursFromNow(10), NOW, 24, 2)).toBe(true);
  });
  it("fires exactly at the 24h edge", () => {
    expect(dueForReminder(hoursFromNow(24), NOW, 24, 2)).toBe(true);
  });
  it("does NOT fire inside the 2h window (no overlap with the 2h reminder)", () => {
    expect(dueForReminder(hoursFromNow(1.5), NOW, 24, 2)).toBe(false);
    expect(dueForReminder(hoursFromNow(2), NOW, 24, 2)).toBe(false);
  });
  it("does not fire beyond 24h", () => {
    expect(dueForReminder(hoursFromNow(30), NOW, 24, 2)).toBe(false);
  });
});

describe("dueForReminder — invalid input", () => {
  it("returns false for an unparseable date", () => {
    expect(dueForReminder("not-a-date", NOW, 24, 0)).toBe(false);
  });
});
