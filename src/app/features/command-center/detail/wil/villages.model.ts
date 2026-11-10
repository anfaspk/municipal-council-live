import { normalizeAr } from '../../../../domain/validate/search';
import { Village } from '../../../../domain/stats/stats';
import { Band, band, BANDS } from '../../../../domain/stats/turnout';
import { RankInput } from '../charts/ranked.model';

export { normalizeAr };

export function filterVillages(
  list: readonly Village[],
  q: string,
  bands: readonly Band[] = [],
): Village[] {
  const words = normalizeAr(q).split(' ').filter(Boolean);
  return list.filter((v) => {
    if (bands.length && !bands.includes(band(v.t))) return false;
    if (!words.length) return true;
    const name = normalizeAr(v.ar);
    return words.every((w) => name.includes(w));
  });
}

export function bandCounts(list: readonly Village[]): Record<Band, number> {
  const out = Object.fromEntries(BANDS.map((b) => [b, 0])) as Record<Band, number>;
  list.forEach((v) => out[band(v.t)]++);
  return out;
}

export const villageRows = (list: readonly Village[]): RankInput<number>[] =>
  list.map((v) => ({ id: v.id, name: v.ar, reg: v.reg, voted: v.voted, rank: v.rank }));
