import { ICand, IWil, raceOfInterim } from '../../domain/interim/interim';
import { SPLIT_GOV } from './tv-slide.model';

export const INT_STEP = 20 * 1000,
  INT_FROM = SPLIT_GOV * 1000 + 2600;
export const interimDuration = (wilayat: number): number =>
  INT_FROM + Math.max(1, wilayat) * INT_STEP;

export interface InterimRow {
  id: number;
  name: string;
  i: number;
  wil: IWil | null;
  seats: number;
  leaders: ICand[];
  rest: { c: ICand; w: number }[];
  other: { v: number; vP: number | null; w: number } | null;
  margin: number | null;
  tied: boolean;
  line: number | null;
}
export interface InterimGov {
  rows: InterimRow[];
  loaded: number;
  votes: number;
}
const bar = (votes: number, most: number): number =>
  most > 0 ? Math.min(1, Math.max(0, votes / most)) : 0;

export function interimRow(w: { id: number; name: string; i: number }, r?: IWil): InterimRow {
  if (!r)
    return {
      ...w,
      wil: null,
      seats: 0,
      leaders: [],
      rest: [],
      other: null,
      margin: null,
      tied: false,
      line: null,
    };
  const race = raceOfInterim(r),
    seats = r.seats ?? 1,
    most = r.cands.reduce((m, c) => Math.max(m, c.v), 0),
    last = race.leaders[race.leaders.length - 1],
    held = new Set(race.leaders.map((c) => c.id));
  return {
    id: w.id,
    name: r.name || w.name,
    i: w.i,
    wil: r,
    seats,
    leaders: race.leaders,
    rest: r.cands.filter((c) => !held.has(c.id)).map((c) => ({ c, w: bar(c.v, most) })),
    other: r.nota === null ? null : { v: r.nota, vP: r.notaP, w: bar(r.nota, most) },
    margin: race.margin,
    tied: race.tied,
    line: last ? bar(last.v, most) : null,
  };
}

export function interimGov(
  wil: readonly { id: number; name: string; i: number }[],
  res: ReadonlyMap<number, IWil>,
): InterimGov {
  const rows = wil.map((w) => interimRow(w, res.get(w.id)));
  return {
    rows,
    loaded: rows.filter((r) => r.wil).length,
    votes: rows.reduce((n, r) => n + (r.wil?.votes ?? 0), 0),
  };
}
