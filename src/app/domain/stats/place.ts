import { kept } from '../same';
import { num } from '../validate/figure';
import { Age, ageOf, shareAges, sumAges } from './age';
import { stampOf } from './stamp';
import {
  Counts,
  countsOf,
  Figures,
  figuresOf,
  Hour,
  tally,
  VillageResp,
  WilayatResp,
} from './stats';

const atOf = (lV: unknown, prev?: string | null): string | null =>
  lV === undefined ? (prev ?? null) : stampOf(lV);

export interface WilayatDetail {
  id: number;
  pop: Figures;
  reg: Counts;
  voted: number;
  votedM: number;
  votedF: number;
  hours: Hour[];
  ages: Age | null;
  vlc: number | null;
  at: string | null;
}

export function wilayatDetail(id: number, r: WilayatResp, prev?: WilayatDetail): WilayatDetail {
  const t = tally(r.hPSL),
    keep = prev && (!t || t.broken);
  return kept(
    {
      id,
      pop: figuresOf(r.p, prev?.pop),
      reg: kept(countsOf(r.r, prev?.reg), prev?.reg),
      voted: keep ? prev.voted : (t?.v ?? 0),
      votedM: keep ? prev.votedM : (t?.m ?? 0),
      votedF: keep ? prev.votedF : (t?.f ?? 0),
      hours: keep ? prev.hours : (t?.hours ?? []),
      ages: sumAges(r.hPSL, prev?.ages),
      vlc: num(r.vLC) ?? prev?.vlc ?? null,
      at: atOf(r.lV, prev?.at),
    },
    prev,
  );
}

export interface VillageDetail {
  id: number;
  pop: Figures;
  reg: Counts;
  voted: Counts;
  notVoted: Counts;
  ages: { voted: Age; not: Age } | null;
  at: string | null;
}

function blockAges(b: VillageResp['pS'] | undefined, prev?: Age): Age | null {
  if (!b) return prev ?? null;
  const a = ageOf(b);
  if (a.some((x) => x.v === null || x.m === null || x.f === null) && prev) return prev;
  return shareAges(a, prev);
}

export function villageDetail(id: number, r: VillageResp, prev?: VillageDetail): VillageDetail {
  const voted = blockAges(r.pS, prev?.ages?.voted),
    not = blockAges(r.nV, prev?.ages?.not);
  return kept(
    {
      id,
      pop: figuresOf(r.p, prev?.pop),
      reg: kept(countsOf(r.r, prev?.reg), prev?.reg),
      voted: kept(countsOf({ t: r.pS?.v, m: r.pS?.vM, f: r.pS?.vF }, prev?.voted), prev?.voted),
      notVoted: kept(
        countsOf({ t: r.nV?.v, m: r.nV?.vM, f: r.nV?.vF }, prev?.notVoted),
        prev?.notVoted,
      ),
      ages: voted && not ? kept({ voted, not }, prev?.ages ?? undefined) : (prev?.ages ?? null),
      at: atOf(r.lV, prev?.at),
    },
    prev,
  );
}
