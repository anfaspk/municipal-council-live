export function activeOf(ratios: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < ratios.length; i++) if ((ratios[i] ?? 0) > (ratios[best] ?? 0)) best = i;
  return best;
}

export function keyStep(key: string, i: number, n: number, rtl: boolean): number | null {
  if (n <= 0) return null;
  const fwd = rtl ? 'ArrowLeft' : 'ArrowRight',
    back = rtl ? 'ArrowRight' : 'ArrowLeft';
  const j =
    key === fwd ? i + 1 : key === back ? i - 1 : key === 'Home' ? 0 : key === 'End' ? n - 1 : null;
  return j === null ? null : Math.max(0, Math.min(n - 1, j));
}
