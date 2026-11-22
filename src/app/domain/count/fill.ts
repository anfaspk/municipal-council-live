import { REGIONS, regionWils } from '../places/places';
import { GEO } from '../geo/geo.data';
import { keptList } from '../same';
import { placeName } from '../stats/stats';
import { CGov } from './count';
import { blankWil } from './reduce';

export function fillCount(govs: CGov[], prev: readonly CGov[] = []): CGov[] {
  const have = new Set(govs.map((g) => g.apiId)),
    added = REGIONS.filter((r) => !have.has(r.id) && GEO.g[String(r.id)]).map((r): CGov => ({
      id: String(r.id),
      apiId: r.id,
      ar: placeName(r.ar),
      wil: [],
    }));
  let changed = added.length > 0;
  const before = new Map(prev.map((g) => [g.apiId, g]));
  const out = [...govs, ...added].map((g) => {
    const known = new Set(g.wil.map((w) => w.id)),
      missing = regionWils(g.apiId).filter((w) => !known.has(w.id));
    if (!missing.length) return g;
    changed = true;
    const old = before.get(g.apiId);
    if (
      old &&
      old.ar === g.ar &&
      old.wil.length === g.wil.length + missing.length &&
      g.wil.every((w, i) => old.wil[i] === w) &&
      missing.every((w, i) => old.wil[g.wil.length + i]!.id === w.id)
    )
      return old;
    return { ...g, wil: [...g.wil, ...missing.map((w) => blankWil(g.id, w.id, placeName(w.ar)))] };
  });
  return changed ? keptList(out, prev) : govs;
}
