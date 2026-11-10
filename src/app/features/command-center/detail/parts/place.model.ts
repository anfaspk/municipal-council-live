import { pctNum, pctOf, pts } from '../../../../domain/format';
import { Counts, Figures } from '../../../../domain/stats/stats';
import { Band, band } from '../../../../domain/stats/turnout';
import { clamp, r2 } from '../charts/chart';

export type Side = 'up' | 'down' | 'level';
export const sideOf = (d: number): Side => (d > 0 ? 'up' : d < 0 ? 'down' : 'level');

export type CmpKey = 'self' | 'up' | 'nat';
export interface CmpInput {
  key: CmpKey;
  label: string;
  t: number | null;
}
export interface CmpRow extends CmpInput {
  k: number;
  band: Band | null;
}
export interface Compare {
  rows: CmpRow[];
  diff: string | null;
  gap: string | null;
  side: Side | null;
  against: string | null;
}

export function compareModel(list: readonly CmpInput[]): Compare {
  const rows = list.map((r): CmpRow => ({
      ...r,
      k: r.t === null ? 0 : r2(clamp(r.t / 100, 0, 1)),
      band: r.t === null ? null : band(r.t),
    })),
    self = rows.find((r) => r.key === 'self'),
    other = rows.find((r) => r.key !== 'self' && r.t !== null),
    d = self?.t != null && other?.t != null ? self.t - other.t : null;
  return {
    rows,
    diff: d === null ? null : pts(d),
    gap: d === null ? null : pctNum(Math.abs(d)),
    side: d === null ? null : sideOf(d),
    against: d === null ? null : other!.label,
  };
}

export type FlowKey = 'pop' | 'reg' | 'voted' | 'not';
export interface FlowStep {
  key: FlowKey;
  t: number | null;
  m: number | null;
  f: number | null;
  km: number | null;
  of: string | null;
}

const step = (key: FlowKey, x: Figures, of: string | null): FlowStep => ({
  key,
  t: x.t,
  m: x.m,
  f: x.f,
  km: x.m !== null && x.f !== null && x.m + x.f > 0 ? r2(x.m / (x.m + x.f)) : null,
  of,
});
const shareOf = (part: number | null, whole: number | null): string | null =>
  part === null || whole === null || !(whole > 0) ? null : pctOf(part, whole);

export function flowModel(
  pop: Figures | null | undefined,
  reg: Counts,
  voted: Counts,
  not?: Counts,
): FlowStep[] {
  const rest: Counts = not ?? {
    t: Math.max(0, reg.t - voted.t),
    m: Math.max(0, reg.m - voted.m),
    f: Math.max(0, reg.f - voted.f),
  };
  return [
    step('pop', pop ?? { t: null, m: null, f: null }, null),
    step('reg', reg, shareOf(reg.t, pop?.t ?? null)),
    step('voted', voted, shareOf(voted.t, reg.t)),
    step('not', rest, shareOf(rest.t, reg.t)),
  ];
}

export interface GenderRate {
  t: number | null;
  txt: string | null;
  voted: number;
  reg: number;
  k: number;
}
export interface Gender {
  m: string | null;
  f: string | null;
  km: number | null;
  gap: string | null;
  lead: 'm' | 'f' | null;
  rate: { m: GenderRate; f: GenderRate };
}

const rateOf = (voted: number, reg: number): GenderRate => {
  const t = reg > 0 ? (voted / reg) * 100 : null;
  return {
    t,
    txt: reg > 0 ? pctOf(voted, reg) : null,
    voted,
    reg,
    k: t === null ? 0 : r2(clamp(t / 100, 0, 1)),
  };
};

export function genderModel(reg: Counts, voted: Counts): Gender {
  const all = voted.m + voted.f,
    d = all > 0 ? ((voted.m - voted.f) / all) * 100 : null;
  return {
    m: all > 0 ? pctOf(voted.m, all) : null,
    f: all > 0 ? pctOf(voted.f, all) : null,
    km: all > 0 ? r2(voted.m / all) : null,
    gap: d === null ? null : pctNum(Math.abs(d)),
    lead: d === null || d === 0 ? null : d > 0 ? 'm' : 'f',
    rate: { m: rateOf(voted.m, reg.m), f: rateOf(voted.f, reg.f) },
  };
}
