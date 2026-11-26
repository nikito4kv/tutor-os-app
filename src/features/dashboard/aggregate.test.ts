import { describe, expect, it } from "vitest";
import { selectLowBalanceStudents, sumAmounts } from "./aggregate";

const students = [
  { id: "a", name: "Аня" },
  { id: "b", name: "Борис" },
  { id: "c", name: "Вера" },
];

describe("selectLowBalanceStudents", () => {
  it("sums lessons_left across a student's packages", () => {
    const packages = [
      { student_id: "a", lessons_left: 1 },
      { student_id: "a", lessons_left: 1 },
    ];
    const result = selectLowBalanceStudents(students.slice(0, 1), packages, 2);
    expect(result).toEqual([{ id: "a", name: "Аня", lessonsLeft: 2 }]);
  });

  it("includes the threshold value and excludes balances above it", () => {
    const packages = [
      { student_id: "a", lessons_left: 2 }, // == threshold → included
      { student_id: "b", lessons_left: 3 }, // > threshold → excluded
    ];
    const result = selectLowBalanceStudents(students, packages, 2);
    expect(result.map((s) => s.id)).toEqual(["c", "a"]); // c has 0, then a has 2
  });

  it("counts students with no packages as zero balance", () => {
    const result = selectLowBalanceStudents(students, [], 2);
    expect(result.map((s) => s.lessonsLeft)).toEqual([0, 0, 0]);
  });

  it("sorts lowest balance first", () => {
    const packages = [
      { student_id: "a", lessons_left: 2 },
      { student_id: "b", lessons_left: 1 },
      // c has none → 0
    ];
    const result = selectLowBalanceStudents(students, packages, 2);
    expect(result.map((s) => s.id)).toEqual(["c", "b", "a"]);
  });
});

describe("sumAmounts", () => {
  it("sums payment amounts", () => {
    expect(sumAmounts([1500, 2000, 500])).toBe(4000);
  });

  it("is zero for no payments", () => {
    expect(sumAmounts([])).toBe(0);
  });
});
