
export interface Box {
  w: number;
  h: number;
}
export const NO_BOX: Box = { w: 0, h: 0 };

export const r2 = (n: number): number => Math.round(n * 100) / 100;
export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));
export const frac = (part: number | null, whole: number | null): number =>
  part === null || whole === null || !(whole > 0) ? 0 : clamp(part / whole, 0, 1);

export function niceMax(n: number): number {
  if (!(n > 0)) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * p >= n) return k * p;
  return 10 * p;
}
export const ticksOf = (max: number, count = 4): number[] =>
  Array.from({ length: count + 1 }, (_, i) => r2((max * i) / count));

export type Pt = readonly [number, number];
export const lineOf = (pts: readonly Pt[]): string =>
  pts.map((p, i) => (i ? 'L' : 'M') + r2(p[0]) + ' ' + r2(p[1])).join(' ');
export function areaOf(top: readonly Pt[], bottom: readonly Pt[]): string {
  if (!top.length) return '';
  return lineOf([...top, ...[...bottom].reverse()]) + 'Z';
}

const NUM = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi;
export function mixPath(a: string, b: string, k: number): string | null {
  if (a === b || k >= 1) return b;
  const na = a.match(NUM) ?? [],
    nb = b.match(NUM) ?? [];
  if (na.length !== nb.length || a.replace(NUM, '#') !== b.replace(NUM, '#')) return null;
  let i = 0;
  return b.replace(NUM, () => {
    const x = +na[i]!,
      y = +nb[i++]!;
    return String(r2(x + (y - x) * k));
  });
}

export const DASH = '—';
export const orDash = (n: number | null | undefined, f: (n: number) => string): string =>
  n === null || n === undefined ? DASH : f(n);

export function short(name: string, max = 24): string {
  const s = name.trim();
  if (s.length <= max) return s;
  const cut = s.lastIndexOf(' ', max - 1);
  return (cut > max / 2 ? s.slice(0, cut) : s.slice(0, max - 1)).trimEnd() + '…\u200f';
}
