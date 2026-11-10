import { kept, keptList } from '../same';
import { num } from '../validate/figure';

export const AGE_BANDS = [21, 31, 41, 51, 61, 71] as const;
export type AgeBand = (typeof AGE_BANDS)[number];
export type AgeKey = `v${AgeBand}` | `vM${AgeBand}` | `vF${AgeBand}`;
export type AgeFields = Partial<Record<AgeKey, number>>;
export const AGE_KEYS: readonly AgeKey[] = AGE_BANDS.flatMap(
  (b) => [`v${b}`, `vM${b}`, `vF${b}`] as const,
);

export interface AgeRow {
  band: AgeBand;
  v: number | null;
  m: number | null;
  f: number | null;
}
export type Age = readonly AgeRow[];

export const ageLabel = (b: AgeBand): string => (b === 71 ? '71+' : b + '–' + (b + 9));

export function ageOf(row: object | null | undefined): AgeRow[] {
  const r = (row ?? {}) as Readonly<Record<string, unknown>>;
  return AGE_BANDS.map((band) => ({
    band,
    v: num(r['v' + band]),
    m: num(r['vM' + band]),
    f: num(r['vF' + band]),
  }));
}

export function sumAges(
  list: readonly (object | null | undefined)[] | null | undefined,
  prev?: Age | null,
): Age | null {
  if (!Array.isArray(list)) return prev ?? null;
  let broken = false;
  const out = AGE_BANDS.map((band): AgeRow => {
    const sum = (k: string): number | null => {
      let s = 0;
      for (const x of list) {
        const n = num((x as Readonly<Record<string, unknown>> | null | undefined)?.[k]);
        if (n === null) return null;
        s += n;
      }
      return s;
    };
    const r = { band, v: sum('v' + band), m: sum('vM' + band), f: sum('vF' + band) };
    if (r.v === null || r.m === null || r.f === null) broken = true;
    return r;
  });
  if (broken && prev) return prev;
  return shareAges(out, prev);
}

export function shareAges(next: AgeRow[], prev?: Age | null): Age {
  if (!prev) return next;
  return keptList(
    next.map((r, i) => kept(r, prev[i])),
    prev as AgeRow[],
  );
}

export function ageTotal(a: Age | null): { v: number; m: number; f: number } | null {
  if (!a || a.some((r) => r.v === null || r.m === null || r.f === null)) return null;
  return a.reduce((s, r) => ({ v: s.v + r.v!, m: s.m + r.m!, f: s.f + r.f! }), {
    v: 0,
    m: 0,
    f: 0,
  });
}

export interface VillageAgeRow {
  band: AgeBand;
  voted: AgeRow;
  not: AgeRow;
  t: number | null;
  tM: number | null;
  tF: number | null;
}
const share = (a: number | null, b: number | null): number | null =>
  a === null || b === null || a + b === 0 ? null : (a / (a + b)) * 100;
export function villageAges(voted: Age, not: Age): VillageAgeRow[] {
  return AGE_BANDS.map((band, i) => {
    const v = voted[i]!,
      n = not[i]!;
    return { band, voted: v, not: n, t: share(v.v, n.v), tM: share(v.m, n.m), tF: share(v.f, n.f) };
  });
}
