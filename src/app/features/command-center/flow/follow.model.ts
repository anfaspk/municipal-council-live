import { countRace, type CGov, type CSt, type CWil } from '../../../domain/count/count';
import { pct, pctOf } from '../../../domain/format';
import { ranksOf } from '../../../domain/rank';
import type { Gov } from '../../../domain/stats/stats';
import { band, turnout, type Band } from '../../../domain/stats/turnout';
import type { WCand, WRegion } from '../../../domain/winners/winners';

export * from './follow-place';
import type { Follow } from './follow-place';

export type FollowPhase = 'vote' | 'count' | 'win';

export function placeWils(f: Follow, govs: readonly CGov[]): CWil[] | null {
  const g = govs.find((x) => x.id === f.gov);
  if (!g?.wil.length) return null;
  const ws = f.wil === null ? g.wil : g.wil.filter((w) => w.id === f.wil);
  return ws.length ? ws : null;
}

export function followPhase(counting: boolean, wils: readonly CWil[] | null): FollowPhase {
  if (!counting) return 'vote';
  return wils?.length && wils.every((w) => w.published) ? 'win' : 'count';
}

export interface FollowVote {
  name: string;
  within: string | null;
  t: number;
  pct: string;
  band: Band;
  rank: number;
  of: number;
  voted: number;
  reg: number;
}

export function followVote(f: Follow, govs: readonly Gov[]): FollowVote | null {
  const g = govs.find((x) => x.id === f.gov);
  if (!g) return null;
  const list: readonly { reg: number; voted: number; ar: string }[] =
    f.wil === null ? govs : g.wils;
  const i = f.wil === null ? govs.indexOf(g) : g.wils.findIndex((w) => w.id === f.wil);
  const p = list[i];
  if (!p) return null;
  const t = turnout(p),
    ranks = ranksOf(list, (x) => turnout(x));
  return {
    name: p.ar,
    within: f.wil === null ? null : g.ar,
    t,
    pct: pct(t),
    band: band(t),
    rank: ranks[i]!,
    of: list.length,
    voted: p.voted,
    reg: p.reg,
  };
}

export interface FollowHolder {
  seat: number;
  name: string;
  v: number;
}
export interface FollowCount {
  name: string;
  st: CSt;
  counted: number;
  cast: number;
  pct: string;
  k: number;
  seats: number;
  holders: FollowHolder[];
  done: number;
  n: number;
}

const ORDER: readonly CSt[] = ['await', 'count', 'pend', 'decl'];
export function followCount(f: Follow, govs: readonly CGov[]): FollowCount | null {
  const g = govs.find((x) => x.id === f.gov),
    ws = placeWils(f, govs);
  if (!g || !ws) return null;
  const cast = ws.reduce((s, w) => s + w.cast, 0),
    counted = ws.reduce((s, w) => s + w.counted, 0),
    one = f.wil === null ? null : ws[0]!;
  const st = ws.some((w) => w.st === 'count')
    ? 'count'
    : ORDER[Math.min(...ws.map((w) => ORDER.indexOf(w.st)))]!;
  return {
    name: one ? one.ar : g.ar,
    st,
    counted,
    cast,
    pct: pctOf(counted, cast),
    k: cast ? Math.min(1, counted / cast) : 0,
    seats: one ? one.seats : 0,
    holders: one ? countRace(one).top.map((c, i) => ({ seat: i + 1, name: c.ar, v: c.v })) : [],
    done: ws.filter((w) => w.st === 'pend' || w.st === 'decl').length,
    n: ws.length,
  };
}

export interface FollowWin {
  name: string;
  winners: WCand[];
  done: number;
  n: number;
}
export function followWin(f: Follow, region: WRegion | null): FollowWin | null {
  if (!region || String(region.id) !== f.gov) return null;
  if (f.wil === null)
    return {
      name: region.name,
      winners: [],
      done: region.wils.filter((w) => w.published).length,
      n: region.wils.length,
    };
  const w = region.wils.find((x) => x.id === f.wil);
  return w ? { name: w.name, winners: w.winners, done: w.published ? 1 : 0, n: 1 } : null;
}
