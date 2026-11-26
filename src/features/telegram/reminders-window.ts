/**
 * Pure window logic for scheduled reminders — kept free of `server-only` and I/O
 * so it's unit-testable (the runner in reminders.ts does the DB work). A target
 * time is "due" when it lies in the half-open window `(notBeforeHours, withinHours]`
 * hours from now. The windows are chosen so the 24h and 2h reminders never overlap:
 * a lesson booked < 24h out gets only the 2h nudge, never a same-tick double-send.
 */
export function dueForReminder(
  targetIso: string,
  now: number,
  withinHours: number,
  notBeforeHours = 0,
): boolean {
  const diffHours = (new Date(targetIso).getTime() - now) / 3_600_000;
  if (Number.isNaN(diffHours)) return false;
  return diffHours > notBeforeHours && diffHours <= withinHours;
}
