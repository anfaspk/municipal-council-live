import type { Screen } from '../../../core/screen/screen-prefs';
import { fmt, pct, pctNum } from '../../../domain/format';
import type { Gov, Hour } from '../../../domain/stats/stats';
import { band, turnout, type Band } from '../../../domain/stats/turnout';


export type GovSort = 'turnout' | 'votes' | 'name';
export const GOV_SORTS: readonly GovSort[] = ['turnout', 'votes', 'name'];

export interface GovRow {
  id: string;
  apiId: number;
  ar: string;
  rank: number;
  t: number;
  pct: string;
  band: Band;
  voted: number;
  votes: string;
}

export function govRows(
  ranked: readonly Gov[],
  rankOf: (id: string) => number,
  sort: GovSort,
): GovRow[] {
  const rows = ranked.map((g): GovRow => {
    const t = turnout(g);
    return {
      id: g.id,
      apiId: g.apiId,
      ar: g.ar,
      rank: rankOf(g.id),
      t,
      pct: pct(t),
      band: band(t),
      voted: g.voted,
      votes: fmt(g.voted),
    };
  });
  if (sort === 'votes') return rows.sort((a, b) => b.voted - a.voted || a.rank - b.rank);
  if (sort === 'name') return rows.sort((a, b) => a.ar.localeCompare(b.ar, 'ar'));
  return rows;
}

export interface Spark {
  points: string;
  from: string;
}
export function sparkOf(hours: readonly Hour[], w = 320, h = 40): Spark {
  const rows = hours.filter((x) => x.v > 0 || hours.length === 1);
  if (!rows.length) return { points: '', from: '' };
  let acc = 0;
  const cum = rows.map((x) => (acc += x.v)),
    max = cum[cum.length - 1] || 1,
    step = w / Math.max(1, cum.length - 1);
  const at = (v: number, i: number) =>
    (cum.length === 1 ? 0 : i * step).toFixed(1) + ',' + (h - 4 - (v / max) * (h - 8)).toFixed(1);
  const pts = cum.map(at);
  if (cum.length === 1) pts.push(w.toFixed(1) + ',' + (4).toFixed(1));
  const first = rows[0]!.h;
  return { points: pts.join(' '), from: (first < 10 ? '0' : '') + first + ':00' };
}

export const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;
export function ringDash(k: number): string {
  const c = Math.max(0, Math.min(1, k));
  return (RING_C * c).toFixed(1) + ' ' + RING_C.toFixed(1);
}

export function cmpOf(t: number, nat: number): { key: string; p: string } {
  const d = t - nat;
  if (Math.abs(d) < 0.005) return { key: 'flCmpEven', p: '' };
  return { key: d > 0 ? 'flCmpAbove' : 'flCmpBelow', p: pctNum(Math.abs(d)) };
}

export interface BarItem {
  screen: Extract<Screen, 'dashboard' | 'tv' | 'wall' | 'winners'>;
  icon: 'grid' | 'tv' | 'box' | 'crown';
  key: string;
  later: boolean;
}
const ITEMS: Record<BarItem['screen'], Omit<BarItem, 'later'>> = {
  dashboard: { screen: 'dashboard', icon: 'grid', key: 'flDash' },
  tv: { screen: 'tv', icon: 'tv', key: 'flTv' },
  wall: { screen: 'wall', icon: 'box', key: 'flCount' },
  winners: { screen: 'winners', icon: 'crown', key: 'flWin' },
};
export function barOf(counting: boolean): BarItem[] {
  const order: BarItem['screen'][] = counting
    ? ['wall', 'winners', 'dashboard', 'tv']
    : ['dashboard', 'tv', 'wall', 'winners'];
  return order.map((s) => ({
    ...ITEMS[s],
    later: !counting && (s === 'wall' || s === 'winners'),
  }));
}

export type Comp = 'phone' | 'port' | 'split' | 'sign';
export function compOf(vw: number, vh: number, anyCoarse: boolean): Comp {
  if (vw < 600 || (vw > vh && vh < 500)) return 'phone';
  if (vw < 900) return 'port';
  return vh > vw && !anyCoarse ? 'sign' : 'split';
}
