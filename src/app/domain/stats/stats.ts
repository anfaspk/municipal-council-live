import { ranksOf } from '../rank';
import { kept, keptList } from '../same';
import { Age, AgeFields, sumAges } from './age';
import { stampOf } from './stamp';
import { num } from '../validate/figure';
import { cleanText } from '../validate/text';

export interface Counts {
  t: number;
  m: number;
  f: number;
}
export interface Ref {
  i: number;
  n: string;
}
export interface HourlyItem extends AgeFields {
  pH: string;
  v: number;
  vM: number;
  vF: number;
}
export interface VoteBlock extends AgeFields {
  v: number;
  vM: number;
  vF: number;
}
export interface OverallResp {
  p: Counts;
  r: Counts;
  lV: string;
  hPSRL: { r: Ref; reg: Counts; hPSL: HourlyItem[] }[];
}
export interface RegionResp {
  p: Counts;
  r: Counts;
  lV: string;
  hPSWL: { w: Ref; r: Counts; hPSL: HourlyItem[] }[];
}
export interface WilayatResp {
  p: Counts;
  r: Counts;
  lV: string;
  hPSL: HourlyItem[];
  vLC: number;
  pSVLL: { vL: Ref; r: Counts; v: number; vM: number; vF: number }[];
}
export interface VillageResp {
  p: Counts;
  r: Counts;
  lV: string;
  pS: VoteBlock;
  nV: VoteBlock;
}

export interface Hour {
  h: number;
  v: number;
  m: number;
  f: number;
}
export interface GovMeta {
  id: string;
  apiId: number;
  ar: string;
}
export interface WilRow {
  id: number;
  name: string;
  ar: string;
  reg: number;
  regM: number;
  regF: number;
  voted: number;
  votedM: number;
  votedF: number;
  hours: Hour[];
  ages: Age | null;
}
export interface Figures {
  t: number | null;
  m: number | null;
  f: number | null;
}
export interface Gov extends GovMeta {
  reg: number;
  regM: number;
  regF: number;
  voted: number;
  votedM: number;
  votedF: number;
  hours: Hour[];
  ages: Age | null;
  pop: Figures | null;
  at: string | null;
  wil: string[];
  wils: WilRow[];
}
export interface Village {
  id: number;
  ar: string;
  reg: number;
  voted: number;
  vM: number;
  vF: number;
  t: number;
  rank: number;
}
export interface Base {
  population: number;
  registered: number;
  regM: number;
  regF: number;
  unread: readonly BaseField[];
}
export type BaseField = 'population' | 'registered' | 'regM' | 'regF';
export const BASE_UNREAD: readonly BaseField[] = ['population', 'registered', 'regM', 'regF'];

export { num };
export const countsOf = (c: Partial<Counts> | null | undefined, prev?: Counts): Counts => ({
  t: num(c?.t) ?? prev?.t ?? 0,
  m: num(c?.m) ?? prev?.m ?? 0,
  f: num(c?.f) ?? prev?.f ?? 0,
});

export function figuresOf(c: Partial<Counts> | null | undefined, prev?: Figures | null): Figures {
  return kept(
    {
      t: num(c?.t) ?? prev?.t ?? null,
      m: num(c?.m) ?? prev?.m ?? null,
      f: num(c?.f) ?? prev?.f ?? null,
    },
    prev ?? undefined,
  );
}

export const placeName = (n: string | null | undefined): string =>
  cleanText(n)
    .replace(/\u0640/g, '')
    .replace(/^محافظة\s+/, '')
    .trim();

export interface Tally {
  hours: Hour[];
  v: number;
  m: number;
  f: number;
  broken: number;
  unlabeled: number;
}
const hourOf = (pH: unknown): number | null => {
  const s = String(pH ?? '').trim();
  return /^\d{1,2}$/.test(s) && +s < 24 ? +s : null;
};
export function tally(list: HourlyItem[] | null | undefined): Tally | null {
  if (!Array.isArray(list)) return null;
  const by = new Map<number, Hour>(),
    out: Tally = { hours: [], v: 0, m: 0, f: 0, broken: 0, unlabeled: 0 };
  list.forEach((x) => {
    const v = num(x?.v),
      m = num(x?.vM),
      f = num(x?.vF);
    if (v === null || m === null || f === null) {
      out.broken++;
      return;
    }
    out.v += v;
    out.m += m;
    out.f += f;
    const h = hourOf(x.pH);
    if (h === null) {
      out.unlabeled++;
      return;
    }
    const o = by.get(h) || { h, v: 0, m: 0, f: 0 };
    o.v += v;
    o.m += m;
    o.f += f;
    by.set(h, o);
  });
  out.hours = [...by.values()].sort((a, b) => a.h - b.h);
  return out;
}

interface Votes {
  voted: number;
  votedM: number;
  votedF: number;
  hours: Hour[];
}
function votesOf(list: HourlyItem[] | null | undefined, prev?: Votes): Votes {
  const t = tally(list);
  if (prev && (!t || t.broken))
    return { voted: prev.voted, votedM: prev.votedM, votedF: prev.votedF, hours: prev.hours };
  return t
    ? { voted: t.v, votedM: t.m, votedF: t.f, hours: t.hours }
    : { voted: 0, votedM: 0, votedF: 0, hours: [] };
}
export function sumHours(all: Hour[][]): Hour[] {
  const by = new Map<number, Hour>();
  all.forEach((hs) =>
    hs.forEach((x) => {
      const o = by.get(x.h) || { h: x.h, v: 0, m: 0, f: 0 };
      o.v += x.v;
      o.m += x.m;
      o.f += x.f;
      by.set(x.h, o);
    }),
  );
  return [...by.values()].sort((a, b) => a.h - b.h);
}
export function baseOf(o: OverallResp, prev?: Base): Base {
  const p = num(o.p?.t),
    r = countsOf(o.r, prev && { t: prev.registered, m: prev.regM, f: prev.regF });
  const sent: Record<BaseField, boolean> = {
    population: p !== null,
    registered: num(o.r?.t) !== null,
    regM: num(o.r?.m) !== null,
    regF: num(o.r?.f) !== null,
  };
  return kept(
    {
      population: p ?? prev?.population ?? 0,
      registered: r.t,
      regM: r.m,
      regF: r.f,
      unread: (prev?.unread ?? BASE_UNREAD).filter((k) => !sent[k]),
    },
    prev,
  );
}

function wilRows(r: RegionResp, prev: readonly WilRow[] = []): WilRow[] {
  const before = new Map(prev.map((w) => [w.id, w]));
  const rows = (r.hPSWL || [])
    .filter((x) => x && x.w)
    .map((x) => {
      const old = before.get(x.w.i),
        reg = countsOf(x.r, old && { t: old.reg, m: old.regM, f: old.regF }),
        n = placeName(x.w.n);
      return kept(
        {
          id: x.w.i,
          name: n,
          ar: n,
          reg: reg.t,
          regM: reg.m,
          regF: reg.f,
          ...votesOf(x.hPSL, old),
          ages: sumAges(x.hPSL, old?.ages),
        },
        old,
      );
    });
  return keptList(rows, prev);
}

export function buildGovs(
  o: OverallResp,
  regions: Map<number, RegionResp>,
  prev: readonly Gov[],
): Gov[] {
  const before = new Map<string, Gov>();
  prev.forEach((g) => {
    if (!before.has(g.id)) before.set(g.id, g);
  });
  const govs = (o.hPSRL || [])
    .filter((it) => it && it.r)
    .map((it) => {
      const apiId = it.r.i,
        id = String(apiId),
        n = placeName(it.r.n);
      const rg = regions.get(apiId),
        old = before.get(id),
        reg = countsOf(it.reg, old && { t: old.reg, m: old.regM, f: old.regF });
      const wils = rg ? wilRows(rg, old?.wils) : old ? old.wils : [];
      return kept(
        {
          id,
          apiId,
          ar: n,
          reg: reg.t,
          regM: reg.m,
          regF: reg.f,
          ...votesOf(it.hPSL, old),
          ages: sumAges(it.hPSL, old?.ages),
          pop: rg ? figuresOf(rg.p, old?.pop) : (old?.pop ?? null),
          at: rg ? stampOf(rg.lV) : (old?.at ?? null),
          wil: wils.map((w) => w.name),
          wils,
        },
        old,
      );
    });
  return keptList(govs, prev);
}

export function villagesOf(r: WilayatResp, prev: readonly Village[] = []): Village[] {
  const before = new Map(prev.map((v) => [v.id, v]));
  const out = (r.pSVLL || [])
    .filter((x) => x && x.vL && x.vL.i > 0)
    .map((x) => {
      const old = before.get(x.vL.i),
        reg = num(x.r?.t) ?? old?.reg ?? 0,
        voted = num(x.v) ?? old?.voted ?? 0;
      return {
        id: x.vL.i,
        ar: placeName(x.vL.n),
        reg,
        voted,
        vM: num(x.vM) ?? old?.vM ?? 0,
        vF: num(x.vF) ?? old?.vF ?? 0,
        t: reg ? (voted / reg) * 100 : 0,
        rank: 0,
      };
    });
  const rank = ranksOf(out, (v) => v.t);
  out.forEach((v, i) => {
    v.rank = rank[i]!;
  });
  return out;
}

export function turnoutCurve(
  hours: Hour[],
  reg: number,
): { vals: number[]; from: number; to: number } {
  const from = hours[0]?.h ?? 0,
    to = hours.length ? hours[hours.length - 1]!.h + 1 : 0,
    vals = [0];
  let acc = 0;
  for (let h = from; h < to; h++) {
    const x = hours.find((y) => y.h === h);
    acc += x ? x.v : 0;
    vals.push(reg ? (acc / reg) * 100 : 0);
  }
  return { vals, from, to };
}
export function hourLabels(from: number, to: number, n: number): string[] {
  if (!(to > from)) return [];
  return Array.from({ length: n }, (_, i) => {
    const t = Math.round((from + ((to - from) * i) / (n - 1)) * 60),
      h = Math.floor(t / 60) % 24,
      m = t % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  });
}
