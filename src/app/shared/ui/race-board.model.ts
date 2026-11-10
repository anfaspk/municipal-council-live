import { CCand, CWil } from '../../domain/count/count';
import { Gain, raceOf, VoteHistory } from '../../domain/count/leading';

const f2 = (v: number): string => (+v).toFixed(2);

export interface Spot {
  cx: string;
  cy: string;
}

export interface ResCand {
  id: string;
  name: string;
  ini: string;
  photo: string | null;
  v: number;
  share: number | null;
  w: string;
}
export interface ResSpark {
  line: string;
  area: string;
  head: Spot;
}
export interface ResMomentum {
  n: number;
  min: number;
  spark: ResSpark;
}
export interface ResSeat extends ResCand {
  seat: number;
  tight: boolean;
  mo: ResMomentum | null;
}
export interface ResNext extends ResCand {
  rank: number;
  tight: boolean;
  ofSeat: number;
  ofSeatW: string;
  need: number;
  trend: { n: number; min: number; closing: boolean } | null;
}
export interface ResRow extends ResCand {
  rank: number;
  d: string;
}
const SPARK_W = 168,
  SPARK_H = 40;

export function raceCand(c: CCand, top: number): ResCand {
  return {
    id: c.id,
    name: c.ar,
    ini: c.ini,
    photo: c.photo ?? null,
    v: c.v,
    share: c.vP,
    w: Math.min(1, c.v / (top || 1)).toFixed(3),
  };
}

function spark(g: Gain): ResSpark {
  const h = g.pts,
    first = h[0]!,
    last = h[h.length - 1]!,
    t0 = first[0],
    t1 = last[0] || t0 + 1,
    lo = first[1],
    hi = Math.max(lo + 1, last[1]);
  const pts = h.map((p): [number, number] => [
    ((p[0] - t0) / Math.max(1, t1 - t0)) * (SPARK_W - 4) + 2,
    SPARK_H - 3 - ((p[1] - lo) / (hi - lo)) * (SPARK_H - 6),
  ]);
  const line = pts.map((p, i) => (i ? 'L' : 'M') + f2(p[0]) + ' ' + f2(p[1])).join(''),
    e = pts[pts.length - 1]!;
  return {
    line,
    area: line + 'L' + f2(e[0]) + ' ' + SPARK_H + 'L2 ' + SPARK_H + 'Z',
    head: { cx: f2(e[0]), cy: f2(e[1]) },
  };
}

export interface RaceView {
  seats: number;
  cands: number;
  seatCards: ResSeat[];
  next: ResNext | null;
  rest: ResRow[];
  restFrom: number;
  restTo: number;
  restRows: number;
}

export const REST_DENSE = 12;
export function restGrid(n: number): { cols: number; rows: number; dense: boolean } {
  return { cols: 2, rows: Math.max(1, Math.ceil(n / 2)), dense: n > REST_DENSE };
}

export function raceView(w: CWil, hist: VoteHistory): RaceView | null {
  const r = raceOf(w);
  if (!r) return null;
  const top = r.sorted[0]?.v || 1;
  const last = r.top[r.top.length - 1];
  const seatCards = [...r.top, ...r.tied].map((c, k): ResSeat => {
    const g = hist.gain(w, c),
      level = k >= r.top.length;
    return {
      ...raceCand(c, top),
      seat: level ? r.top.length + 1 : k + 1,
      tight: level || (!r.tied.length && r.tight && k === r.top.length - 1),
      mo: g && g.n > 0 ? { n: g.n, min: g.min, spark: spark(g) } : null,
    };
  });
  let next: ResNext | null = null;
  if (r.chaser && last) {
    const out = r.chaser,
      cut = last.v,
      gb = hist.gain(w, out),
      ga = hist.gain(w, last),
      cl = gb && ga ? gb.n - ga.n : 0,
      of = (out.v / (cut || 1)) * 100;
    next = {
      ...raceCand(out, top),
      rank: r.top.length + 1,
      tight: r.tight,
      ofSeat: of,
      ofSeatW: Math.min(1, of / 100).toFixed(3),
      need: cut - out.v + 1,
      trend: cl && gb ? { n: Math.abs(cl), min: gb.min, closing: cl > 0 } : null,
    };
  }
  const from = seatCards.length + (next ? 1 : 0),
    rest = r.sorted.slice(from).map((c, k): ResRow => ({
      ...raceCand(c, top),
      rank: from + k + 1,
      d: (0.34 + k * 0.025).toFixed(3),
    }));
  return {
    seats: r.seats,
    cands: r.sorted.length,
    seatCards,
    next,
    rest,
    restFrom: from + 1,
    restTo: r.sorted.length,
    restRows: Math.ceil(rest.length / 2),
  };
}
