import { pctOf } from '../../../../domain/format';
import { Age, AgeBand, ageLabel, AGE_BANDS, VillageAgeRow } from '../../../../domain/stats/age';
import { clamp, niceMax, r2 } from '../charts/chart';

export interface AgeBarRow {
  band: AgeBand;
  label: string;
  m: number | null;
  f: number | null;
  v: number | null;
  km: number;
  kf: number;
  share: string | null;
  top: boolean;
}
export interface AgeBars {
  rows: AgeBarRow[];
  max: number;
  total: { m: number; f: number; v: number } | null;
  top: { label: string; share: string; v: number } | null;
}

const sum = (a: number | null, b: number | null) => (a === null || b === null ? null : a + b);

export function ageBarsModel(ages: Age | null): AgeBars {
  const at = (i: number) => ages?.[i] ?? null,
    known =
      !!ages && ages.length === AGE_BANDS.length && ages.every((r) => r.m !== null && r.f !== null),
    total = known
      ? ages!.reduce((s, r) => ({ m: s.m + r.m!, f: s.f + r.f! }), { m: 0, f: 0 })
      : null,
    all = total ? total.m + total.f : 0,
    max = niceMax(Math.max(0, ...AGE_BANDS.map((_, i) => Math.max(at(i)?.m ?? 0, at(i)?.f ?? 0)))),
    k = (x: number | null) => (x === null ? 0 : r2(clamp(x / max, 0, 1)));
  const rows = AGE_BANDS.map((b, i): AgeBarRow => {
    const r = at(i),
      m = r?.m ?? null,
      f = r?.f ?? null,
      v = r?.v ?? sum(m, f);
    return {
      band: b,
      label: ageLabel(b),
      m,
      f,
      v,
      km: k(m),
      kf: k(f),
      share: v === null || !(all > 0) ? null : pctOf(v, all),
      top: false,
    };
  });
  const top =
    all > 0
      ? rows.reduce<AgeBarRow | null>((a, r) => (r.v !== null && (!a || r.v > a.v!) ? r : a), null)
      : null;
  if (top) top.top = true;
  return {
    rows,
    max,
    total: total ? { ...total, v: all } : null,
    top: top && top.share ? { label: top.label, share: top.share, v: top.v! } : null,
  };
}

export interface RateRow {
  band: AgeBand;
  label: string;
  t: number | null;
  tM: number | null;
  tF: number | null;
  k: number;
  kM: number;
  kF: number;
  hi: boolean;
  lo: boolean;
}
export interface Rate {
  rows: RateRow[];
  ref: number | null;
  hi: RateRow | null;
  lo: RateRow | null;
}

const k100 = (t: number | null) => (t === null ? 0 : r2(clamp(t / 100, 0, 1)));

export function rateModel(list: readonly VillageAgeRow[], ref: number | null): Rate {
  const rows = list.map((r): RateRow => ({
      band: r.band,
      label: ageLabel(r.band),
      t: r.t,
      tM: r.tM,
      tF: r.tF,
      k: k100(r.t),
      kM: k100(r.tM),
      kF: k100(r.tF),
      hi: false,
      lo: false,
    })),
    known = rows.filter((r) => r.t !== null);
  let hi: RateRow | null = null,
    lo: RateRow | null = null;
  for (const r of known) {
    if (!hi || r.t! > hi.t!) hi = r;
    if (!lo || r.t! < lo.t!) lo = r;
  }
  if (hi && lo && hi.t === lo.t) hi = lo = null;
  if (hi) hi.hi = true;
  if (lo) lo.lo = true;
  return { rows, ref: ref === null ? null : k100(ref), hi, lo };
}
