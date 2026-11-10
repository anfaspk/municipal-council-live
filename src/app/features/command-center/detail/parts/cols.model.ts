import { ranksOf } from '../../../../domain/rank';
import { Band, band } from '../../../../domain/stats/turnout';
import { clamp, r2 } from '../charts/chart';

export interface ColPlace<K> {
  id: K;
  name: string;
  t: number;
}
export interface Col<K> extends ColPlace<K> {
  rank: number;
  band: Band;
  k: number;
  me: boolean;
}
export interface Cols<K> {
  cols: Col<K>[];
  ref: number | null;
  me: Col<K> | null;
  at: number | null;
}

export function colsModel<K>(
  list: readonly ColPlace<K>[],
  current: K,
  ref: number | null,
): Cols<K> {
  const order = list.map((p, i) => ({ p, i })).sort((a, b) => b.p.t - a.p.t || a.i - b.i),
    ranks = ranksOf(
      order.map((o) => o.p),
      (p) => p.t,
    ),
    cols = order.map(({ p }, i): Col<K> => ({
      ...p,
      rank: ranks[i]!,
      band: band(p.t),
      k: r2(clamp(p.t / 100, 0, 1)),
      me: p.id === current,
    })),
    i = cols.findIndex((c) => c.me);
  return {
    cols,
    ref: ref === null ? null : r2(clamp(ref / 100, 0, 1)),
    me: i < 0 ? null : cols[i]!,
    at: i < 0 ? null : r2((i + 0.5) / cols.length),
  };
}
