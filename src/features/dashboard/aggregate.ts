/**
 * Pure aggregation helpers for the dashboard. Kept free of Supabase/React so
 * they're trivially unit-testable (see aggregate.test.ts).
 */

export interface LowBalanceStudent {
  id: string;
  name: string;
  lessonsLeft: number;
}

/**
 * Students whose total remaining lessons (summed across their packages) is at
 * or below `threshold` — i.e. "time to top up". Students with no packages count
 * as 0, matching the balance shown on the student card. Lowest balance first.
 */
export function selectLowBalanceStudents(
  students: { id: string; name: string }[],
  packages: { student_id: string; lessons_left: number }[],
  threshold: number,
): LowBalanceStudent[] {
  const leftById = new Map<string, number>();
  for (const p of packages) {
    leftById.set(p.student_id, (leftById.get(p.student_id) ?? 0) + p.lessons_left);
  }
  return students
    .map((s) => ({ id: s.id, name: s.name, lessonsLeft: leftById.get(s.id) ?? 0 }))
    .filter((s) => s.lessonsLeft <= threshold)
    .sort((a, b) => a.lessonsLeft - b.lessonsLeft);
}

/** Sum of payment amounts (the dashboard "income this month" figure). */
export function sumAmounts(amounts: number[]): number {
  return amounts.reduce((total, a) => total + a, 0);
}
