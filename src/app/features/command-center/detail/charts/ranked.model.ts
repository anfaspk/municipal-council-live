import { ranksOf } from '../../../../domain/rank';
import { Band, band, turnout } from '../../../../domain/stats/turnout';
import { clamp, r2 } from './chart';

export type RankSort = 'turnout' | 'votes' | 'name';
export interface RankInput<K> {
  id: K;
  name: string;
  reg: number;
  voted: number;
  rank?: number;
}
export interface RankRow<K> {
  id: K;
  name: string;
  rank: number;
  reg: number;
  voted: number;
  t: number;
  band: Band;
  k: number;
}
export interface Ranked<K> {
  rows: RankRow<K>[];
  tick: number | null;
  tied: number;
}

const COLLATOR = new Intl.Collator('ar');

export function rankedModel<K>(
  list: readonly RankInput<K>[],
  sort: RankSort,
  ref: number | null = null,
): Ranked<K> {
  const ts = list.map((x) => turnout(x)),
    ranks = ranksOf(ts, (t) => t),
    rows = list.map((x, i): RankRow<K> => ({
      id: x.id,
      name: x.name,
      rank: x.rank ?? ranks[i]!,
      reg: x.reg,
      voted: x.voted,
      t: ts[i]!,
      band: band(ts[i]!),
      k: r2(clamp(ts[i]! / 100, 0, 1)),
    })),
    order = rows.map((r, i) => ({ r, i }));
  order.sort((a, b) =>
    sort === 'name'
      ? COLLATOR.compare(a.r.name, b.r.name) || a.i - b.i
      : sort === 'votes'
        ? b.r.voted - a.r.voted || a.i - b.i
        : b.r.t - a.r.t || a.i - b.i,
  );
  const seen = new Map<number, number>();
  ranks.forEach((r) => seen.set(r, (seen.get(r) ?? 0) + 1));
  return {
    rows: order.map((x) => x.r),
    tick: ref === null ? null : r2(clamp(ref / 100, 0, 1)),
    tied: ranks.filter((r) => seen.get(r)! > 1).length,
  };
}
