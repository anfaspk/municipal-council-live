const sameItem = (a: unknown, b: unknown): boolean =>
  a === b ||
  (!!a &&
    !!b &&
    typeof a === 'object' &&
    typeof b === 'object' &&
    !Array.isArray(a) &&
    Object.keys(a).every(
      (k) => (a as Record<string, unknown>)[k] === (b as Record<string, unknown>)[k],
    ) &&
    Object.keys(a).length === Object.keys(b).length);
export const sameList = <T>(a: readonly T[], b: readonly T[]): boolean =>
  a === b || (a.length === b.length && a.every((x, i) => sameItem(x, b[i])));
export function kept<T extends object>(next: T, old: T | undefined): T {
  if (!old) return next;
  for (const k of Object.keys(next) as (keyof T)[]) {
    const a = next[k],
      b = old[k];
    if (a === b) continue;
    if (Array.isArray(a) && Array.isArray(b) && sameList(a, b)) continue;
    return next;
  }
  return old;
}
export const keptList = <T>(next: T[], old: readonly T[]): T[] =>
  next.length === old.length && next.every((x, i) => x === old[i]) ? (old as T[]) : next;
