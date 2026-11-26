import { describe, expect, it } from "vitest";
import {
  addDays,
  formatRelativeToNow,
  groupLessonsByDay,
  isSameDay,
  startOfWeek,
  weekRange,
} from "./date";

describe("startOfWeek", () => {
  it("returns Monday 00:00 for a midweek date", () => {
    const wed = new Date(2026, 5, 10, 15, 30); // Wed 10 Jun 2026
    const result = startOfWeek(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(8); // Mon 8 Jun
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });

  it("treats Sunday as the last day of the week, not the first", () => {
    const sun = new Date(2026, 5, 14, 12, 0); // Sun 14 Jun 2026
    const result = startOfWeek(sun);
    expect(result.getDate()).toBe(8); // still Mon 8 Jun
  });

  it("is idempotent on a Monday", () => {
    const mon = new Date(2026, 5, 8, 0, 0);
    expect(startOfWeek(mon).getTime()).toBe(mon.getTime());
  });
});

describe("addDays", () => {
  it("adds and subtracts days without mutating the input", () => {
    const d = new Date(2026, 5, 8);
    expect(addDays(d, 7).getDate()).toBe(15);
    expect(addDays(d, -1).getDate()).toBe(7);
    expect(d.getDate()).toBe(8); // unchanged
  });
});

describe("weekRange", () => {
  it("spans exactly 7 days [from, to)", () => {
    const weekStart = startOfWeek(new Date(2026, 5, 10));
    const { from, to } = weekRange(weekStart);
    const ms = new Date(to).getTime() - new Date(from).getTime();
    expect(ms).toBe(7 * 24 * 60 * 60 * 1000);
  });
});

describe("isSameDay", () => {
  it("ignores the time of day", () => {
    expect(isSameDay(new Date(2026, 5, 8, 1), new Date(2026, 5, 8, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 5, 8), new Date(2026, 5, 9))).toBe(false);
  });
});

describe("formatRelativeToNow", () => {
  const now = new Date(2026, 5, 13, 12, 0).getTime();

  it("uses minutes under an hour", () => {
    const in30min = new Date(2026, 5, 13, 12, 30).toISOString();
    expect(formatRelativeToNow(in30min, now)).toContain("30");
  });

  it("uses hours under a day", () => {
    const in5h = new Date(2026, 5, 13, 17, 0).toISOString();
    expect(formatRelativeToNow(in5h, now)).toContain("5");
  });

  it("uses days beyond 24h", () => {
    const in3d = new Date(2026, 5, 16, 12, 0).toISOString();
    expect(formatRelativeToNow(in3d, now)).toContain("3");
  });
});

describe("groupLessonsByDay", () => {
  it("buckets by day and sorts items by time", () => {
    const lessons = [
      { starts_at: "2026-06-09T15:00:00.000Z" },
      { starts_at: "2026-06-08T10:00:00.000Z" },
      { starts_at: "2026-06-08T09:00:00.000Z" },
    ];
    const groups = groupLessonsByDay(lessons);
    expect(groups).toHaveLength(2);
    const [firstDay, secondDay] = groups;
    // First day's lessons sorted ascending.
    expect(firstDay?.items.map((l) => l.starts_at)).toEqual([
      "2026-06-08T09:00:00.000Z",
      "2026-06-08T10:00:00.000Z",
    ]);
    expect(secondDay?.items).toHaveLength(1);
  });

  it("returns no groups for an empty list", () => {
    expect(groupLessonsByDay([])).toEqual([]);
  });

  it("orders days and items newest-first when desc (history view)", () => {
    const lessons = [
      { starts_at: "2026-06-08T09:00:00.000Z" },
      { starts_at: "2026-06-09T15:00:00.000Z" },
      { starts_at: "2026-06-08T10:00:00.000Z" },
    ];
    const groups = groupLessonsByDay(lessons, true);
    expect(groups).toHaveLength(2);
    const [firstDay, secondDay] = groups;
    // Newest day first.
    expect(firstDay?.items.map((l) => l.starts_at)).toEqual(["2026-06-09T15:00:00.000Z"]);
    // Within a day, latest time first.
    expect(secondDay?.items.map((l) => l.starts_at)).toEqual([
      "2026-06-08T10:00:00.000Z",
      "2026-06-08T09:00:00.000Z",
    ]);
  });
});
