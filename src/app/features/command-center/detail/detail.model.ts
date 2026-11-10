import { ranksOf } from '../../../domain/rank';
import { Gov, Village } from '../../../domain/stats/stats';
import { Band, band, turnout } from '../../../domain/stats/turnout';
import { DetailAt, DetailLevel, levelOf } from './detail-url';

export interface Crumb {
  label: string;
  to: DetailAt | null;
  current: boolean;
}
export interface DetailHead {
  level: DetailLevel;
  title: string | null;
  crumbs: Crumb[];
  rank: number | null;
  of: number | null;
  t: number | null;
  band: Band | null;
  prev: { at: DetailAt; name: string } | null;
  next: { at: DetailAt; name: string } | null;
}
interface Place<K> {
  id: K;
  name: string;
  t: number;
}
interface Ranked extends Pick<DetailHead, 'prev' | 'next'> {
  rank: number;
  of: number;
  t: number;
}

function placeIn<K>(list: readonly Place<K>[], id: K, toAt: (id: K) => DetailAt): Ranked | null {
  const order = list
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p.t - a.p.t || a.i - b.i)
      .map((x) => x.p),
    i = order.findIndex((p) => p.id === id),
    side = (p: Place<K> | undefined) => (p ? { at: toAt(p.id), name: p.name } : null);
  if (i < 0) return null;
  return {
    rank: ranksOf(order, (p) => p.t)[i]!,
    of: order.length,
    t: order[i]!.t,
    prev: side(order[i - 1]),
    next: side(order[i + 1]),
  };
}

export function detailHead(
  at: DetailAt,
  govs: readonly Gov[],
  villages: readonly Village[] | undefined,
  oman: string,
): DetailHead {
  const level = levelOf(at),
    { gov, wil, vil } = at,
    g = govs.find((x) => x.id === gov),
    w = wil === undefined ? undefined : g?.wils.find((x) => x.id === wil),
    v = vil === undefined ? undefined : villages?.find((x) => x.id === vil),
    crumbs: Crumb[] = [
      { label: oman, to: null, current: false },
      { label: g?.ar ?? '…', to: { gov }, current: level === 'gov' },
    ];
  if (wil !== undefined)
    crumbs.push({ label: w?.name ?? '…', to: { gov, wil }, current: level === 'wil' });
  if (vil !== undefined) crumbs.push({ label: v?.ar ?? '…', to: null, current: true });

  let title: string | null = null,
    place: Ranked | null = null;
  if (level === 'gov' && g) {
    title = g.ar;
    const list = govs.map((x) => ({ id: x.id, name: x.ar, t: turnout(x) }));
    place = placeIn(list, g.id, (id) => ({ gov: id }));
  } else if (level === 'wil' && g && w) {
    title = w.name;
    const list = g.wils.map((x) => ({ id: x.id, name: x.name, t: turnout(x) }));
    place = placeIn(list, w.id, (id) => ({ gov, wil: id }));
  } else if (level === 'vil' && v && villages && wil !== undefined) {
    title = v.ar;
    const list = villages.map((x) => ({ id: x.id, name: x.ar, t: x.t }));
    place = placeIn(list, v.id, (id) => ({ gov, wil, vil: id }));
  }
  return {
    level,
    title,
    crumbs,
    rank: place?.rank ?? null,
    of: place?.of ?? null,
    t: place?.t ?? null,
    band: place ? band(place.t) : null,
    prev: place?.prev ?? null,
    next: place?.next ?? null,
  };
}
