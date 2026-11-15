import { CGov, CSt, countGov, countNat, countRace, CWil } from '../../../domain/count/count';
import { fmt, pctOf } from '../../../domain/format';
import type { Geo } from '../../../domain/geo/geo.data';
import { raceCand, ResCand } from '../../../shared/ui/race-board.model';

export const STATUSES: readonly CSt[] = ['decl', 'pend', 'count', 'await'];
export const ST_KEY = {
  await: 'stAwait',
  count: 'stCount',
  pend: 'cxCountedSt',
  decl: 'stDecl',
} as const satisfies Record<CSt, string>;
export type StatusCounts = Readonly<Record<CSt, number>>;

export interface StatusSeg {
  st: CSt;
  n: number;
  k: string;
}
export function statusSegs(c: StatusCounts, n: number): StatusSeg[] {
  return STATUSES.filter((s) => c[s] > 0).map((s) => ({
    st: s,
    n: c[s],
    k: (c[s] / Math.max(1, n)).toFixed(4),
  }));
}

export interface NatView {
  p: string;
  k: number;
  counted: string;
  cast: string;
  left: string;
  m: string;
  f: string;
  mP: string;
  fP: string;
  wil: number;
  counts: StatusCounts;
  segs: StatusSeg[];
}
export function natView(govs: CGov[], registered: number): NatView {
  const n = countNat(govs, registered, 0);
  const counts = { await: n.await, count: n.count, pend: n.pend, decl: n.decl };
  return {
    p: pctOf(n.counted, n.cast),
    k: n.cast ? Math.min(1, n.counted / n.cast) : 0,
    counted: fmt(n.counted),
    cast: fmt(n.cast),
    left: fmt(n.cast - n.counted),
    m: fmt(n.m),
    f: fmt(n.f),
    mP: pctOf(n.m, n.cast),
    fP: pctOf(n.f, n.cast),
    wil: n.wil,
    counts,
    segs: statusSegs(counts, n.wil),
  };
}

export function placeStatus(c: StatusCounts, n: number, counted: number): CSt {
  if (n && c.decl === n) return 'decl';
  if (n && c.decl + c.pend === n) return 'pend';
  return counted > 0 || c.count > 0 ? 'count' : 'await';
}

export interface GovRow {
  id: string;
  name: string;
  st: CSt;
  p: string;
  counted: string;
  cast: string;
  left: string;
  m: string;
  f: string;
  mP: string;
  fP: string;
  n: number;
  done: number;
  counts: StatusCounts;
  segs: StatusSeg[];
  ties: number;
}
export function govRow(g: CGov): GovRow {
  const s = countGov(g),
    counts = { await: s.await, count: s.count, pend: s.pend, decl: s.decl },
    m = g.wil.reduce((a, w) => a + w.m, 0),
    f = g.wil.reduce((a, w) => a + w.f, 0);
  return {
    id: g.id,
    name: g.ar,
    st: placeStatus(counts, s.n, s.counted),
    p: pctOf(s.counted, s.cast),
    counted: fmt(s.counted),
    cast: fmt(s.cast),
    left: fmt(s.cast - s.counted),
    m: fmt(m),
    f: fmt(f),
    mP: pctOf(m, s.cast),
    fP: pctOf(f, s.cast),
    n: s.n,
    done: s.decl + s.pend,
    counts,
    segs: statusSegs(counts, s.n),
    ties: g.wil.filter((w) => w.st !== 'await' && (w.conflict || w.drawn)).length,
  };
}
export const govRows = (govs: readonly CGov[]): GovRow[] => govs.map(govRow);

export type TieState = 'open' | 'drawn' | null;
export const tieState = (w: CWil): TieState =>
  w.st === 'await' ? null : w.drawn ? 'drawn' : w.conflict ? 'open' : null;

export interface WilRow {
  id: number;
  name: string;
  st: CSt;
  seats: number;
  p: string;
  k: string;
  counted: string;
  leaders: ResCand[];
  tied: number;
  tie: TieState;
}
export function wilRow(w: CWil): WilRow {
  const r = countRace(w),
    top = Math.max(1, ...w.cands.map((c) => c.v));
  return {
    id: w.id,
    name: w.ar,
    st: w.st,
    seats: w.seats,
    p: pctOf(w.counted, w.cast),
    k: (w.cast ? Math.min(1, w.counted / w.cast) : 0).toFixed(4),
    counted: fmt(w.counted),
    leaders: w.st === 'await' ? [] : r.top.map((c) => raceCand(c, top)),
    tied: r.tied.length,
    tie: tieState(w),
  };
}
export const wilRows = (g: CGov): WilRow[] => g.wil.map(wilRow);

export interface WilHead {
  st: CSt;
  p: string;
  k: number;
  seats: number;
  cands: number;
  counted: string;
  cast: string;
  left: string;
  m: string;
  f: string;
  cP: string;
  mP: string;
  fP: string;
}
export function headOf(w: CWil): WilHead {
  const k = w.st === 'await' ? 0 : w.st === 'count' ? (w.cast ? w.counted / w.cast : 0) : 1;
  return {
    st: w.st,
    p: pctOf(w.counted, w.cast),
    k: Math.min(1, k),
    seats: w.seats,
    cands: w.cands.length,
    counted: fmt(w.counted),
    cast: fmt(w.cast),
    left: fmt(w.cast - w.counted),
    m: fmt(w.m),
    f: fmt(w.f),
    cP: pctOf(w.counted, w.cast),
    mP: pctOf(w.m, w.cast),
    fP: pctOf(w.f, w.cast),
  };
}


export type Place =
  { k: 'nat' } | { k: 'gov'; gid: string } | { k: 'wil'; gid: string; wid: number };
export const NAT: Place = { k: 'nat' };
export const placeKey = (p: Place): string =>
  p.k === 'nat' ? 'nat' : p.k === 'gov' ? 'g' + p.gid : 'w' + p.wid;
export const samePlace = (a: Place, b: Place): boolean => placeKey(a) === placeKey(b);
export const upOf = (p: Place): Place => (p.k === 'wil' ? { k: 'gov', gid: p.gid } : NAT);

export function siblingOf(govs: readonly CGov[], p: Place, step: 1 | -1): Place | null {
  if (p.k === 'nat') return null;
  if (p.k === 'gov') {
    const i = govs.findIndex((g) => g.id === p.gid);
    const g = i < 0 ? null : govs[(i + step + govs.length) % govs.length];
    return g && govs.length > 1 ? { k: 'gov', gid: g.id } : null;
  }
  const wils = govs.find((g) => g.id === p.gid)?.wil ?? [],
    i = wils.findIndex((w) => w.id === p.wid),
    w = i < 0 ? null : wils[(i + step + wils.length) % wils.length];
  return w && wils.length > 1 ? { k: 'wil', gid: p.gid, wid: w.id } : null;
}

export interface WalkStep {
  place: Place;
  ms: number;
}
export function walkSteps(govs: readonly CGov[], sec: number): WalkStep[] {
  const per = sec * 1000,
    hold = Math.max(4500, per),
    out: WalkStep[] = [{ place: NAT, ms: hold }];
  for (const g of govs) {
    out.push({ place: { k: 'gov', gid: g.id }, ms: hold });
    for (const w of g.wil) out.push({ place: { k: 'wil', gid: g.id, wid: w.id }, ms: per });
  }
  return out;
}
export const walkFrom = (steps: readonly WalkStep[], p: Place): number =>
  Math.max(
    0,
    steps.findIndex((s) => samePlace(s.place, p)),
  );


export interface MapGeom {
  box: string;
  perPx: number;
  k: number;
  r: number;
  shapes: { id: string; d: string }[];
  pins: { id: number; x: number; y: number; st: CSt }[];
}
export function mapGeom(
  geo: Geo,
  govs: readonly CGov[],
  gid: string | null,
  width: number,
  height = 0,
): MapGeom {
  const st = new Map<number, CSt>();
  for (const g of govs) for (const w of g.wil) st.set(w.id, w.st);
  let x = 0,
    y = 0,
    w = geo.w,
    h = geo.h;
  const one = gid ? geo.g[gid] : undefined;
  if (one) {
    const [x0, y0, x1, y1] = one.b,
      pad = Math.max(8, (x1 - x0) * 0.06);
    [x, y, w, h] = [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
  }
  const perPx = Math.max(w / Math.max(1, width), height > 0 ? h / height : 0),
    ids = one ? [gid!] : Object.keys(geo.g);
  return {
    box: [x, y, w, h].map((v) => +v.toFixed(2)).join(' '),
    perPx,
    k: +perPx.toFixed(3),
    r: +((one ? 7 : 5) * perPx).toFixed(2),
    shapes: ids.map((id) => ({ id, d: geo.g[id]!.d })),
    pins: ids.flatMap((id) =>
      (geo.wilPt[id] ?? []).map((p) => ({
        id: p.i,
        x: p.c[0],
        y: p.c[1],
        st: st.get(p.i) ?? 'await',
      })),
    ),
  };
}
