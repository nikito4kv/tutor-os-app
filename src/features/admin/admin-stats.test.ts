import { describe, expect, it } from "vitest";
import { donutGradient, formatDelta, lessonSegments, LESSON_STATUS_META } from "./admin-stats";
import type { AdminStats } from "./queries";

/** Минимальный стат-объект: задаём только счётчики уроков, остальное — нули. */
function statsWith(lessons: Partial<AdminStats>): AdminStats {
  return {
    tutors: 0,
    students: 0,
    lessons: 0,
    feedback_new: 0,
    tutors_new_7d: 0,
    students_new_7d: 0,
    lessons_scheduled: 0,
    lessons_done: 0,
    lessons_canceled: 0,
    lessons_no_show: 0,
    lessons_done_7d: 0,
    tutors_no_students: 0,
    tutors_inactive_30d: 0,
    ...lessons,
  };
}

describe("formatDelta", () => {
  it("prefixes a positive delta with '+'", () => {
    expect(formatDelta(8)).toBe("+8");
    expect(formatDelta(1)).toBe("+1");
  });

  it("returns null for zero or negative (nothing to show)", () => {
    expect(formatDelta(0)).toBeNull();
    expect(formatDelta(-3)).toBeNull();
  });
});

describe("LESSON_STATUS_META", () => {
  it("covers exactly the four lesson statuses, in order", () => {
    expect(LESSON_STATUS_META.map((m) => m.key)).toEqual([
      "lessons_scheduled",
      "lessons_done",
      "lessons_canceled",
      "lessons_no_show",
    ]);
  });

  it("wires a non-empty i18n label and an icon for each", () => {
    for (const meta of LESSON_STATUS_META) {
      expect(typeof meta.label).toBe("string");
      expect(meta.label.length).toBeGreaterThan(0);
      expect(meta.icon).toBeDefined();
    }
  });

  it("gives every status a semantic tone", () => {
    for (const meta of LESSON_STATUS_META) {
      expect(meta.tone).toBeDefined();
    }
  });
});

describe("lessonSegments", () => {
  it("sums the four statuses into the total and rounds each share", () => {
    const { total, segments } = lessonSegments(
      statsWith({
        lessons_scheduled: 228,
        lessons_done: 240,
        lessons_canceled: 12,
        lessons_no_show: 18,
      }),
    );
    expect(total).toBe(498);
    const done = segments.find((s) => s.key === "lessons_done");
    expect(done?.count).toBe(240);
    expect(done?.pct).toBe(48); // 240/498 → 48.19 → 48
  });

  it("keeps shares at 0 (no divide-by-zero) when there are no lessons", () => {
    const { total, segments } = lessonSegments(statsWith({}));
    expect(total).toBe(0);
    expect(segments.every((s) => s.pct === 0)).toBe(true);
  });
});

describe("donutGradient", () => {
  it("is empty when there are no lessons (caller draws a neutral ring)", () => {
    const { total, segments } = lessonSegments(statsWith({}));
    expect(donutGradient(segments, total)).toBe("");
  });

  it("builds a conic-gradient over token colours, skipping empty sectors", () => {
    const { total, segments } = lessonSegments(
      statsWith({ lessons_scheduled: 1, lessons_done: 1 }),
    );
    const g = donutGradient(segments, total);
    expect(g.startsWith("conic-gradient(")).toBe(true);
    expect(g).toContain("hsl(var(--primary))");
    expect(g).toContain("hsl(var(--success))");
    expect(g).not.toContain("--destructive"); // canceled = 0 → пропущен
    expect(g).toContain("180deg"); // 50/50 split
  });
});
