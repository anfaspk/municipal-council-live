import { Geo, GEO } from '../../domain/geo/geo.data';
import { boundsOf, pathRings } from '../../domain/geo/shapes';
import { normalizeAr } from '../../domain/validate/search';
import { KeyInfo, screenKey } from '../../shared/motion/screen-keys';

export type MapSource = Pick<Geo, 'w' | 'h' | 'g' | 'wilPt' | 'outline'>;

export interface GovCard {
  id: string;
  apiId: number;
  name: string;
  wils: number;
  n: number;
}

export function govCards(
  names: ReadonlyMap<string, { name: string; wils: number }>,
  geo: MapSource = GEO,
): GovCard[] {
  return Object.keys(geo.g)
    .map(Number)
    .sort((a, b) => a - b)
    .map((apiId, k) => {
      const id = String(apiId),
        s = names.get(id);
      return {
        id,
        apiId,
        name: s?.name ?? '',
        wils: s?.wils || (geo.wilPt[id]?.length ?? 0),
        n: k + 1,
      };
    });
}

export interface MapGov {
  id: string;
  d: string;
  x: number;
  y: number;
}
export interface MapPoint {
  id: number;
  x: number;
  y: number;
}
export interface OmanMap {
  view: string;
  w: number;
  h: number;
  outline: string;
  govs: MapGov[];
  pts: MapPoint[];
}
const r1 = (x: number) => Math.round(x * 10) / 10;

export function omanMap(geo: MapSource = GEO): OmanMap {
  return {
    view: '0 0 ' + geo.w + ' ' + geo.h,
    w: geo.w,
    h: geo.h,
    outline: geo.outline,
    govs: Object.entries(geo.g).map(([id, g]) => ({ id, d: g.d, x: g.c[0], y: g.c[1] })),
    pts: Object.values(geo.wilPt)
      .flat()
      .map((p) => ({ id: p.i, x: p.c[0], y: p.c[1] })),
  };
}

export interface RegionMap {
  view: string;
  d: string;
  pts: MapPoint[];
  size: number;
}
export function regionMap(
  id: string,
  aspect = 16 / 9,
  pad = 0.14,
  geo: MapSource = GEO,
): RegionMap | null {
  const g = geo.g[id];
  if (!g) return null;
  const [x0, y0, x1, y1] = boundsOf(pathRings(g.d).flat()),
    w = Math.max(1, x1 - x0),
    h = Math.max(1, y1 - y0);
  let vw = w * (1 + 2 * pad),
    vh = h * (1 + 2 * pad);
  if (vw / vh < aspect) vw = vh * aspect;
  else vh = vw / aspect;
  const cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;
  return {
    view: [cx - vw / 2, cy - vh / 2, vw, vh].map(r1).join(' '),
    d: g.d,
    pts: (geo.wilPt[id] ?? []).map((p) => ({ id: p.i, x: p.c[0], y: p.c[1] })),
    size: r1(Math.min(vw, vh)),
  };
}

export function titleParts(name: string, kind: string): { kind: string; name: string } {
  const n = name.trim();
  return { kind: !n || n.startsWith(kind) ? '' : kind, name: n };
}
export const titled = (name: string, kind: string): string => {
  const t = titleParts(name, kind);
  return t.kind ? t.kind + ' ' + t.name : t.name;
};

export function matchWils(names: readonly string[], q: string): number[] {
  const words = normalizeAr(q).split(' ').filter(Boolean);
  return names.flatMap((n, i) => {
    const t = normalizeAr(n);
    return words.every((w) => t.includes(w)) ? [i] : [];
  });
}

export type WinnersLayout = 'one' | 'two' | 'many';
export const layoutOf = (n: number): WinnersLayout => (n <= 1 ? 'one' : n === 2 ? 'two' : 'many');

export const placeholders = (seats: number | null): number[] =>
  Array.from({ length: Math.min(4, Math.max(1, seats ?? 1)) }, (_, i) => i);

export const stepIndex = (i: number, n: number, step: number): number =>
  n <= 0 ? 0 : (((i + step) % n) + n) % n;

export interface Spark {
  a: number;
  d: number;
  s: number;
  t: number;
}
export function sparks(n: number, seed = 7): Spark[] {
  let x = seed;
  const next = () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
  return Array.from({ length: n }, (_, i) => ({
    a: Math.round((360 / n) * i + next() * 18),
    d: Math.round(150 + next() * 170),
    s: Math.round(4 + next() * 7),
    t: Math.round(next() * 260),
  }));
}

function seeded(seed: number): () => number {
  let x = Math.max(1, Math.floor(seed) % 2147483647);
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}
export function starfield(
  n: number,
  seed: number,
  size: number,
  w = 1920,
  h = 760,
  lean = 1.4,
): string {
  const rnd = seeded(seed);
  return Array.from({ length: n }, () => {
    const x = Math.round(rnd() * w),
      y = Math.round(Math.pow(rnd(), lean) * h),
      s = (rnd() * size).toFixed(1);
    return x + 'px ' + y + 'px 0 ' + s + 'px';
  }).join(',');
}

export type WinnersKey =
  | { type: 'tab' }
  | { type: 'back' }
  | { type: 'play' }
  | { type: 'move'; step: 1 | -1 }
  | { type: 'jump'; to: 'first' | 'last' };
export function winnersKey(e: KeyInfo, region: boolean): WinnersKey | null {
  const a = screenKey(e, 'tv');
  if (!a) return null;
  if (a.type === 'tab') return a;
  if (a.type === 'close') return { type: 'back' };
  if (!region) return null;
  if (a.type === 'play') return { type: 'play' };
  if (a.type === 'wil') return { type: 'move', step: a.step };
  if (a.type === 'go')
    return a.to === 'next' || a.to === 'prev'
      ? { type: 'move', step: a.to === 'next' ? 1 : -1 }
      : { type: 'jump', to: a.to };
  return null;
}
