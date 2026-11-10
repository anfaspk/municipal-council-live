import { num, Ref } from '../stats/stats';

export type CSt = 'await' | 'count' | 'pend' | 'decl';
export interface CCand {
  id: string;
  ar: string;
  ini: string;
  v: number;
  vP: number | null;
  rank: number;
  win: number;
  photo?: string | undefined;
}
export interface CWil {
  id: number;
  gid: string;
  n: string;
  ar: string;
  cast: number;
  counted: number;
  m: number;
  f: number;
  st: CSt;
  seats: number;
  pt: [number, number] | null;
  cands: CCand[];
  leaders: string[];
  nota: number;
  notaP: number | null;
  conflict: { text: string; res: string } | null;
  drawn: boolean;
  published: boolean;
  detail: boolean;
}
export interface CGov {
  id: string;
  apiId: number;
  ar: string;
  wil: CWil[];
}
export interface CRace {
  sorted: CCand[];
  top: CCand[];
  tied: CCand[];
  chaser: CCand | null;
  gap: number;
  p: number;
}
export interface CGovSum {
  cast: number;
  counted: number;
  await: number;
  count: number;
  pend: number;
  decl: number;
  n: number;
  p: number;
}
export interface CNat extends Omit<CGovSum, 'n'> {
  wil: number;
  seats: number;
  seatsDecl: number;
  govsCounting: number;
  turnout: number;
  leadN: number;
  m: number;
  f: number;
}
export interface CEvent {
  gov: CGov;
  w: CWil;
  delta?: number;
  from?: CSt;
  to?: CSt;
  inC?: CCand;
  outC?: CCand;
  winners?: CCand[];
}

export interface CCounts {
  t: number;
  m: number;
  f: number;
}
export interface CCandRow {
  p: number;
  c: { i: number; n: string; im?: string; imu?: string; ims?: string; imm?: string; iml?: string };
  v: number;
  vP?: string;
}
export interface CWilRow {
  w: Ref;
  m: number;
  v: CCounts;
  c: CCounts;
  cS: string;
  rS: string;
  cFS: string;
  cFT: string;
  cFRS: string;
  lCL: CCandRow[];
  wCL: CCandRow[];
  nV?: { v: number; vP?: string };
}
export interface CountRegionResp {
  v: CCounts;
  c: CCounts;
  cIWL: CWilRow[];
}
export interface CountOverallResp {
  v: CCounts;
  c: CCounts;
  cIRL: { r: Ref; v: CCounts; c: CCounts }[];
}
export type CountWilayatResp = CWilRow;

export function seedOf(s: string): number {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export const SHOW_WINNERS = false;

export const PHOTO_BASE = '';

const norm = (s?: string | null): string => (s || '').toLowerCase().replace(/[\s_-]/g, '');
export const CONFIRMED = {
  cS: ['notstarted', 'started', 'finished'],
  rS: [
    'pending',
    'initialresultready',
    'l1headpublished',
    'l2ecpublished',
    'l3mainpublished',
    'published',
  ],
  cFS: ['na', 'noconflict', 'conflict'],
} as const;
export const hasConflict = (r: Pick<CWilRow, 'cFS'>): boolean => {
  const s = norm(r.cFS);
  return !!s && s !== 'na' && s !== 'noconflict';
};
export const tieDrawn = (r: Pick<CWilRow, 'cFS' | 'cFRS'>): boolean =>
  hasConflict(r) && norm(r.cFRS) === 'resolved';
export const published = (r: Pick<CWilRow, 'rS'>): boolean => norm(r.rS) === 'published';
export function unconfirmed(
  r: Pick<CWilRow, 'cS' | 'rS' | 'cFS'>,
): [keyof typeof CONFIRMED, string][] {
  return (Object.keys(CONFIRMED) as (keyof typeof CONFIRMED)[])
    .filter((k) => {
      const s = norm(r[k]);
      return !!s && !(CONFIRMED[k] as readonly string[]).includes(s);
    })
    .map((k) => [k, String(r[k])]);
}
export function statusOf(
  r: Pick<CWilRow, 'c' | 'cS' | 'rS' | 'cFS'>,
  winners = SHOW_WINNERS,
  counted = num(r.c?.t) ?? 0,
): CSt {
  if (published(r)) return winners ? 'decl' : 'pend';
  if (norm(r.cS) === 'finished' || hasConflict(r)) return 'pend';
  return counted > 0 ? 'count' : 'await';
}
export const shareOf = (x: unknown): number | null =>
  num(typeof x === 'string' && x.trim() !== '' ? Number(x) : x);
export function candInitials(n: string): string {
  const p = n
      .trim()
      .split(/\s+/)
      .filter((x) => x && x !== 'بن' && x !== 'بنت'),
    a = p[0] || '',
    b = p[1] || '';
  return a ? (a[0] + (b ? '\u200c' + b[0] : '')).toUpperCase() : '?';
}
export const countDone = (w: CWil): boolean =>
  w.st === 'decl' || (!SHOW_WINNERS && w.st === 'pend' && !w.conflict);

export function countRace(w: CWil): CRace {
  const decl = w.st === 'decl' && w.cands.some((x) => x.win),
    s = Math.max(0, w.seats);
  const c = w.cands
    .slice()
    .sort(
      (a, b) =>
        (decl ? (a.win || 1e9) - (b.win || 1e9) : 0) ||
        b.v - a.v ||
        (a.rank || 1e9) - (b.rank || 1e9),
    );
  const p = w.cast ? (w.counted / w.cast) * 100 : 0;
  if (decl) {
    const top = c.filter((x) => x.win),
      chaser = c[top.length] || null;
    return { sorted: c, top, tied: [], chaser, gap: top[top.length - 1]!.v - (chaser?.v ?? 0), p };
  }
  const line = s ? (c[s - 1]?.v ?? 0) : 0;
  if (!line) {
    const top = c.slice(0, s).filter((x) => x.v > 0);
    return { sorted: c, top, tied: [], chaser: null, gap: 0, p };
  }
  const below = c[s] ? c[s].v : 0;
  if (c[s] && below === line && !w.drawn)
    return {
      sorted: c,
      top: c.filter((x) => x.v > line),
      tied: c.filter((x) => x.v === line),
      chaser: null,
      gap: 0,
      p,
    };
  return { sorted: c, top: c.slice(0, s), tied: [], chaser: c[s] || null, gap: line - below, p };
}
export function countGov(gv: CGov): CGovSum {
  const s: CGovSum = {
    cast: 0,
    counted: 0,
    await: 0,
    count: 0,
    pend: 0,
    decl: 0,
    n: gv.wil.length,
    p: 0,
  };
  gv.wil.forEach((w) => {
    s.cast += w.cast;
    s.counted += w.counted;
    s[w.st]++;
  });
  s.p = s.cast ? (s.counted / s.cast) * 100 : 0;
  return s;
}
export function countNat(govs: CGov[], registered: number, leadN: number): CNat {
  const n: CNat = {
    cast: 0,
    counted: 0,
    await: 0,
    count: 0,
    pend: 0,
    decl: 0,
    p: 0,
    wil: 0,
    seats: 0,
    seatsDecl: 0,
    govsCounting: 0,
    turnout: 0,
    leadN,
    m: 0,
    f: 0,
  };
  govs.forEach((g) => {
    let any = false;
    g.wil.forEach((w) => {
      n.cast += w.cast;
      n.counted += w.counted;
      n.m += w.m;
      n.f += w.f;
      n[w.st]++;
      n.wil++;
      n.seats += w.seats;
      if (w.st === 'count') any = true;
      if (w.st === 'decl') n.seatsDecl += w.seats;
    });
    if (any) n.govsCounting++;
  });
  n.p = n.cast ? (n.counted / n.cast) * 100 : 0;
  n.turnout = registered ? (n.cast / registered) * 100 : 0;
  return n;
}
