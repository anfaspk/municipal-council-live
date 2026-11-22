import { REGIONS, regionWils } from '../places/places';
import { GEO } from '../geo/geo.data';
import { kept, keptList } from '../same';
import { buildGovs, Counts, Gov, HourlyItem, OverallResp, RegionResp, wilRowsOf } from './stats';

const ZERO: Counts = { t: 0, m: 0, f: 0 };
const EMPTY_REGION: RegionResp = { p: ZERO, r: ZERO, lV: '', hPSWL: [] };
const NOTHING = { reg: undefined as unknown as Counts, hPSL: undefined as unknown as HourlyItem[] };

export function fillOverall(o: OverallResp, known: ReadonlySet<number>): OverallResp {
  const list = Array.isArray(o.hPSRL) ? o.hPSRL : [],
    have = new Set(list.filter((x) => x && x.r).map((x) => x.r.i)),
    missing = REGIONS.filter((r) => known.has(r.id) && !have.has(r.id));
  return missing.length
    ? { ...o, hPSRL: [...list, ...missing.map((r) => ({ r: { i: r.id, n: r.ar }, ...NOTHING }))] }
    : o;
}

export function fillRegion(id: number, r: RegionResp, prev: readonly Gov[] = []): RegionResp {
  const known = new Set(prev.find((g) => g.apiId === id)?.wils.map((w) => w.id)),
    list = Array.isArray(r.hPSWL) ? r.hPSWL : [],
    have = new Set(list.filter((x) => x && x.w).map((x) => x.w.i)),
    missing = regionWils(id).filter((w) => !have.has(w.id));
  if (!missing.length) return r;
  return {
    ...r,
    hPSWL: [
      ...list,
      ...missing.map((w) =>
        known.has(w.id)
          ? { w: { i: w.id, n: w.ar }, r: NOTHING.reg, hPSL: NOTHING.hPSL }
          : { w: { i: w.id, n: w.ar }, r: ZERO, hPSL: [] },
      ),
    ],
  };
}

export function fillGovs(govs: Gov[], prev: readonly Gov[] = []): Gov[] {
  const have = new Set(govs.map((g) => g.apiId)),
    missing = REGIONS.filter((r) => !have.has(r.id) && GEO.g[String(r.id)]);
  const before = new Map(prev.map((g) => [g.apiId, g]));
  const withWils = govs.map((g) => (g.wils.length ? g : localWils(g, before.get(g.apiId))));
  if (!missing.length) return keptList(withWils, govs) === govs ? govs : keptList(withWils, prev);
  const o: OverallResp = {
    p: ZERO,
    r: ZERO,
    lV: '',
    hPSRL: missing.map((r) => ({ r: { i: r.id, n: r.ar }, reg: ZERO, hPSL: [] })),
  };
  const added = buildGovs(
    o,
    new Map(missing.map((r) => [r.id, fillRegion(r.id, EMPTY_REGION)])),
    prev,
  );
  return keptList([...withWils, ...added], prev);
}

function localWils(g: Gov, old: Gov | undefined): Gov {
  const wils = wilRowsOf(fillRegion(g.apiId, EMPTY_REGION), old?.wils ?? []);
  if (!wils.length) return g;
  return kept({ ...g, wil: wils.map((w) => w.name), wils }, old);
}
