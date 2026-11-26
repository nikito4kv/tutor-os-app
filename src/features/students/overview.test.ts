import { describe, expect, it } from "vitest";
import {
  buildActivityFeed,
  buildAttentionItems,
  pickNextLesson,
  sumPaid,
  type ActivityLesson,
} from "./overview";

describe("pickNextLesson", () => {
  it("returns the first element (earliest-first list)", () => {
    expect(pickNextLesson([{ id: "a" }, { id: "b" }])).toEqual({ id: "a" });
  });

  it("returns null for an empty list", () => {
    expect(pickNextLesson([])).toBeNull();
  });
});

describe("sumPaid", () => {
  it("sums payment amounts", () => {
    expect(sumPaid([{ amount: 1500 }, { amount: 2000 }, { amount: 500 }])).toBe(4000);
  });

  it("is zero for no payments", () => {
    expect(sumPaid([])).toBe(0);
  });
});

describe("buildActivityFeed", () => {
  const lessons: ActivityLesson[] = [
    { starts_at: "2026-06-10T15:00:00.000Z", status: "done", topic: "Дроби" },
    { starts_at: "2026-06-03T15:00:00.000Z", status: "no_show", topic: null },
  ];

  it("merges the payment and sorts newest-first", () => {
    const feed = buildActivityFeed(lessons, { paid_at: "2026-06-08T09:00:00.000Z", amount: 5000 });
    expect(feed.map((e) => e.kind)).toEqual(["lesson", "payment", "lesson"]);
    expect(feed[0]).toMatchObject({ kind: "lesson", at: "2026-06-10T15:00:00.000Z" });
    expect(feed[1]).toMatchObject({ kind: "payment", amount: 5000 });
  });

  it("works without a payment", () => {
    const feed = buildActivityFeed(lessons, null);
    expect(feed).toHaveLength(2);
    expect(feed.every((e) => e.kind === "lesson")).toBe(true);
  });

  it("caps the feed at the limit", () => {
    const many: ActivityLesson[] = Array.from({ length: 6 }, (_, i) => ({
      starts_at: `2026-06-0${i + 1}T10:00:00.000Z`,
      status: "done",
      topic: null,
    }));
    expect(buildActivityFeed(many, null, 4)).toHaveLength(4);
  });
});

describe("buildAttentionItems", () => {
  it("is empty when nothing needs attention", () => {
    expect(buildAttentionItems({ toReview: 0, overdue: 0, noUpcoming: false })).toEqual([]);
  });

  it("carries the review count", () => {
    expect(buildAttentionItems({ toReview: 3, overdue: 0, noUpcoming: false })).toEqual([
      { kind: "review", count: 3 },
    ]);
  });

  it("carries the overdue count", () => {
    expect(buildAttentionItems({ toReview: 0, overdue: 2, noUpcoming: false })).toEqual([
      { kind: "overdue", count: 2 },
    ]);
  });

  it("adds noUpcoming when there is no next lesson", () => {
    expect(buildAttentionItems({ toReview: 0, overdue: 0, noUpcoming: true })).toEqual([
      { kind: "noUpcoming" },
    ]);
  });

  it("keeps a fixed priority order: review → overdue → noUpcoming", () => {
    const items = buildAttentionItems({ toReview: 1, overdue: 1, noUpcoming: true });
    expect(items.map((i) => i.kind)).toEqual(["review", "overdue", "noUpcoming"]);
  });
});
