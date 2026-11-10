import { CCand, CGov, countRace, CWil } from './count';

const TIGHT = 0.015;
export const GAIN_WINDOW = 10 * 60 * 1000;
const HISTORY_MAX = 40;

export interface Race {
  sorted: CCand[];
  seats: number;
  top: CCand[];
  tied: CCand[];
  chaser: CCand | null;
  gap: number;
  rel: number;
  tight: boolean;
  counted: number | null;
}

export function raceOf(w: CWil): Race | null {
  if (!w.cands.length) return null;
  const r = countRace(w),
    seats = Math.max(0, w.seats),
    tie = r.tied.length > 0,
    rel = tie ? 0 : r.chaser && w.counted ? r.gap / w.counted : 1;
  return {
    sorted: r.sorted,
    seats,
    top: r.top,
    tied: r.tied,
    chaser: r.chaser,
    gap: r.gap,
    rel,
    tight: tie || (!w.drawn && !!r.chaser && rel < TIGHT),
    counted: w.cast ? (w.counted / w.cast) * 100 : null,
  };
}

export interface Gain {
  n: number;
  min: number;
  pts: readonly (readonly [number, number])[];
}

export class VoteHistory {
  private readonly h = new Map<string, [number, number][]>();

  record(govs: readonly CGov[], t: number): void {
    govs.forEach((g) => {
      g.wil.forEach((w) => {
        w.cands.forEach((c) => {
          const k = w.id + ':' + c.id;
          let h = this.h.get(k);
          if (!h) this.h.set(k, (h = []));
          const last = h[h.length - 1];
          if (last && last[0] === t) last[1] = c.v;
          else h.push([t, c.v]);
          while (h.length > 2 && h[1]![0] < t - GAIN_WINDOW) h.shift();
          if (h.length > HISTORY_MAX) h.splice(1, h.length - HISTORY_MAX);
        });
      });
    });
  }

  gain(w: CWil, c: CCand): Gain | null {
    const h = this.h.get(w.id + ':' + c.id);
    if (!h || h.length < 2) return null;
    const first = h[0]!,
      last = h[h.length - 1]!;
    return {
      n: c.v - first[1],
      min: Math.max(1, Math.round((last[0] - first[0]) / 60000)),
      pts: h,
    };
  }
}
