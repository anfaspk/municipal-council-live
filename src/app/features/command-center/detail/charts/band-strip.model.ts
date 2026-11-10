import { Band, band, BANDS } from '../../../../domain/stats/turnout';
import { r2 } from './chart';

export interface StripPlace<K> {
  id: K;
  name: string;
  t: number;
}
export interface StripSeg {
  band: Band;
  n: number;
  x: number;
  w: number;
}
export interface BandStrip<K> {
  total: number;
  segs: StripSeg[];
  counts: Record<Band, number>;
  best: StripPlace<K>[];
  worst: StripPlace<K>[];
}

export function bandStripModel<K>(list: readonly StripPlace<K>[], n = 3): BandStrip<K> {
  const counts: Record<Band, number> = { low: 0, mid: 0, high: 0 };
  list.forEach((p) => counts[band(p.t)]++);
  const total = list.length,
    segs: StripSeg[] = [];
  let x = 0;
  BANDS.forEach((b) => {
    if (!counts[b]) return;
    const w = counts[b] / total;
    segs.push({ band: b, n: counts[b], x: r2(x), w: r2(w) });
    x += w;
  });
  const order = list.map((p, i) => ({ p, i })).sort((a, b) => b.p.t - a.p.t || a.i - b.i),
    best = order.slice(0, n).map((o) => o.p),
    worst = order
      .slice(Math.max(n, order.length - n))
      .reverse()
      .map((o) => o.p);
  return { total, segs, counts, best, worst };
}
