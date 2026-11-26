/**
 * Total remaining lessons across a student's packages. Single source of truth
 * for the balance display and the low-balance flag.
 */
export function packageBalance(pkgs: { lessons_left: number }[]): number {
  return pkgs.reduce((sum, p) => sum + p.lessons_left, 0);
}
