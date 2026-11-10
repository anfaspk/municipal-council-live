import { candInitials, shareOf } from '../count/count';
import { photoOf } from '../count/reduce';
import { num, Ref } from '../stats/stats';


export interface InterimCandRow {
  p: number;
  c: { i: number; n: string; im?: string; imu?: string; ims?: string; imm?: string; iml?: string };
  v: number;
  vP?: string;
}
export interface InterimResp {
  w: Ref & { r?: Ref };
  m: number;
  v: number;
  cC: number;
  cL: InterimCandRow[];
  nV?: { v: number; vP?: string };
}


export interface ICand {
  id: number;
  name: string;
  ini: string;
  photo: string | null;
  pos: number;
  v: number;
  vP: number | null;
}
export interface IWil {
  id: number;
  name: string;
  seats: number | null;
  votes: number | null;
  candCount: number;
  cands: ICand[];
  nota: number | null;
  notaP: number | null;
}

const photoUrl = (c: InterimCandRow['c']): string | null => photoOf(c) ?? null;

const whole = (x: unknown): number | null => {
  const n = num(x);
  return n !== null && Number.isInteger(n) && n >= 1 ? n : null;
};

export function interimOf(id: number, r: InterimResp, fallbackName = ''): IWil {
  const rows = Array.isArray(r?.cL) ? r.cL : [];
  const cands = rows
    .map((x, k): ICand | null => {
      const v = num(x?.v);
      if (v === null || !x.c) return null;
      const name = x.c.n || '';
      return {
        id: x.c.i,
        name,
        ini: candInitials(name),
        photo: photoUrl(x.c),
        pos: whole(x.p) ?? rows.length + k + 1,
        v,
        vP: shareOf(x.vP),
      };
    })
    .filter((c): c is ICand => c !== null)
    .sort((a, b) => a.pos - b.pos || b.v - a.v);
  return {
    id,
    name: r?.w?.n || fallbackName,
    seats: whole(r?.m),
    votes: num(r?.v),
    candCount: num(r?.cC) ?? cands.length,
    cands,
    nota: num(r?.nV?.v),
    notaP: shareOf(r?.nV?.vP),
  };
}

export interface Race {
  leaders: ICand[];
  next: ICand | null;
  margin: number | null;
  tied: boolean;
}
export function raceOfInterim(w: IWil): Race {
  const seats = w.seats ?? 1,
    top = w.cands.slice(0, seats).filter((c) => c.v > 0),
    next = w.cands[top.length] ?? null,
    last = top[top.length - 1];
  const tied = !!last && !!next && next.v === last.v;
  return {
    leaders: tied ? top.filter((c) => c.v > last.v) : top,
    next,
    margin: last && next ? last.v - next.v : null,
    tied,
  };
}


export type InterimPhase = 'off' | 'soon' | 'open';
export function interimPhase(from: number | null, to: number | null, now: number): InterimPhase {
  if (from === null || (to !== null && to <= from)) return 'off';
  if (now < from) return 'soon';
  return to === null || now < to ? 'open' : 'off';
}

export function timeLeft(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    two = (n: number) => String(n).padStart(2, '0');
  return h ? h + ':' + two(m) + ':' + two(s % 60) : m + ':' + two(s % 60);
}
