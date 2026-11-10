import { GEO } from '../geo/geo.data';
import { CEvent, CGov, countDone, countRace, CWil } from './count';
import { indexCount } from './count-index';
import { blankWil } from './reduce';

export type CountEventType = 'status' | 'change' | 'lead' | 'declare';
export interface CountEvent extends CEvent {
  type: CountEventType;
}

const LEAD_FROM = 0.15;
const signature = (w: CWil) =>
  w.cands.map((c) => c.id + ':' + c.v + ':' + c.win + ':' + c.rank).join(',') +
  '|' +
  w.nota +
  '|' +
  (w.drawn ? 'drawn' : '');

export function diffCount(
  prev: readonly CGov[],
  next: readonly CGov[],
  order?: Iterable<number>,
): CountEvent[] {
  const before = indexCount(prev),
    after = indexCount(next),
    out: CountEvent[] = [];
  for (const id of order ?? next.flatMap((g) => g.wil.map((w) => w.id))) {
    const gov = after.govOf(id),
      w = after.wil(id);
    if (!gov || !w) continue;
    const p = before.wil(id) ?? blankWil(gov.id, id, w.n);
    if (p === w) continue;
    if (w.st !== p.st) out.push({ type: 'status', gov, w, from: p.st, to: w.st });
    if (w.counted !== p.counted || signature(w) !== signature(p))
      out.push({ type: 'change', gov, w, delta: w.counted - p.counted });
    if (
      w.st === 'count' &&
      p.leaders.length &&
      w.cast &&
      w.counted / w.cast > LEAD_FROM &&
      p.leaders.join() !== w.leaders.join()
    ) {
      const top = countRace(w).top,
        inC = top.find((c) => p.leaders.indexOf(c.id) < 0),
        outId = p.leaders.find((x) => w.leaders.indexOf(x) < 0);
      const outC = w.cands.find((c) => c.id === outId);
      if (inC && outC) out.push({ type: 'lead', gov, w, inC, outC });
    }
    if (w.st === 'decl' && p.st !== 'decl') {
      const winners = countRace(w).top;
      if (winners.length) out.push({ type: 'declare', gov, w, winners });
    }
  }
  return out;
}

export const WILAYAT_KNOWN = Object.values(GEO.wilPt).reduce((n, l) => n + l.length, 0);
export const countComplete = (govs: readonly CGov[], known = WILAYAT_KNOWN): boolean =>
  govs.length > 0 &&
  govs.every((g) => g.wil.length > 0 && g.wil.every(countDone)) &&
  govs.reduce((n, g) => n + g.wil.length, 0) >= known;
export const govPublished = (
  g: CGov | null,
  known = g ? (GEO.wilPt[g.id]?.length ?? 0) : 0,
): boolean => !!g && g.wil.length > 0 && g.wil.length >= known && g.wil.every((w) => w.published);
export const natPublished = (govs: readonly CGov[], known = WILAYAT_KNOWN): boolean =>
  govs.length > 0 &&
  govs.every((g) => govPublished(g)) &&
  govs.reduce((n, g) => n + g.wil.length, 0) >= known;
