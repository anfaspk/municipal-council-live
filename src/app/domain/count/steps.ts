import { CGov, CountRegionResp, CountWilayatResp, CWil, SHOW_WINNERS } from './count';
import { indexCount } from './count-index';
import { CountEvent, diffCount } from './diff';
import { blankWil, reduceCount } from './reduce';

export interface CountStep {
  govs: CGov[];
  events: CountEvent[];
}

export function regionStep(
  prev: CGov[],
  regions: ReadonlyMap<number, CountRegionResp>,
  winners = SHOW_WINNERS,
): CountStep & { wanted: number[] } {
  const rows = new Set<number>();
  prev.forEach((g) =>
    (regions.get(g.apiId)?.cIWL || []).forEach((row) => {
      if (row && row.w) rows.add(row.w.i);
    }),
  );
  const govs = reduceCount(prev, { regions }, winners),
    before = indexCount(prev),
    after = indexCount(govs);
  const wanted = [...rows].filter((id) => {
    const w = after.wil(id);
    return !!w && wantsDetail(before.wil(id) ?? blankWil(w.gid, id, w.n), w);
  });
  return { govs, events: diffCount(prev, govs, rows), wanted };
}

export function detailStep(
  prev: CGov[],
  details: ReadonlyMap<number, CountWilayatResp>,
  winners = SHOW_WINNERS,
): CountStep {
  const govs = reduceCount(prev, { details }, winners);
  return { govs, events: diffCount(prev, govs, details.keys()) };
}

function wantsDetail(prev: CWil, next: CWil): boolean {
  return (
    next.counted !== prev.counted ||
    next.st !== prev.st ||
    next.drawn !== prev.drawn ||
    (!next.detail && (next.counted > 0 || next.st === 'decl'))
  );
}
