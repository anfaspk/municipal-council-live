import { GovIndex } from '../../domain/stats/gov-index';
import { Gov, hourLabels, turnoutCurve } from '../../domain/stats/stats';
import { Band, band, National, turnout } from '../../domain/stats/turnout';
import {
  CountryMap,
  countryMap,
  Curve,
  curve,
  Locator,
  locator,
  RegionShape,
  regionShape,
  WilayatStat,
  wilayatStats,
} from './tv-geometry';

export const NATIONAL = 'nat';
export const SPLIT_NATIONAL = 5.6,
  SPLIT_GOV = 4.6;

export interface Gender {
  votedM: number;
  votedF: number;
  turnoutM: number;
  turnoutF: number;
  shareM: number;
  widthM: string;
  widthF: string;
}
export interface Leader {
  rank: number;
  name: string;
  t: number;
  band: Band;
}

interface SlideBase {
  uid: number;
  key: string;
  band: Band;
  split: number;
  count: string;
  done: boolean;
  turnout: number;
  voted: number;
  reg: number;
  gender: Gender;
  govCount: number;
  next: { name: string | null } | null;
}
export interface NationalSlide extends SlideBase {
  kind: 'nat';
  leaders: Leader[];
  map: CountryMap;
}
export interface GovSlide extends SlideBase {
  kind: 'gov';
  name: string;
  rank: number;
  delta: number;
  share: number;
  wilCount: number;
  curve: Curve;
  hours: string[];
  wilayat: WilayatStat[];
  region: RegionShape;
  locator: Locator;
}
export type TvSlide = NationalSlide | GovSlide;

export const slideKeys = (index: GovIndex<Gov>): string[] => [
  NATIONAL,
  ...index.ranked.map((g) => g.id),
];

export function genderOf(d: {
  regM: number;
  regF: number;
  votedM: number;
  votedF: number;
}): Gender {
  const { regF, votedM, votedF } = d,
    both = votedM + votedF,
    shareM = both ? (votedM / both) * 100 : 50;
  return {
    votedM,
    votedF,
    turnoutM: d.regM ? (votedM / d.regM) * 100 : 0,
    turnoutF: regF ? (votedF / regF) * 100 : 0,
    shareM,
    widthM: shareM.toFixed(1) + '%',
    widthF: (100 - shareM).toFixed(1) + '%',
  };
}

const two = (n: number): string => String(n).padStart(2, '0');
let seq = 0;

export function buildSlide(
  keys: string[],
  k: number,
  index: GovIndex<Gov>,
  nat: National,
  done: boolean,
): TvSlide {
  const key = keys[k]!,
    nk = keys[(k + 1) % keys.length]!;
  const base = {
    uid: ++seq,
    key,
    done,
    govCount: index.list.length,
    count: two(k + 1) + ' / ' + two(keys.length),
    next: keys.length < 2 ? null : { name: nk === NATIONAL ? null : (index.get(nk)?.ar ?? null) },
  };
  if (key === NATIONAL) {
    const t = nat.turnout;
    return {
      ...base,
      kind: 'nat',
      band: band(t),
      split: SPLIT_NATIONAL,
      turnout: t,
      voted: nat.voted,
      reg: nat.registered,
      gender: genderOf(nat),
      leaders: index.ranked.slice(0, 3).map((g) => {
        const tg = turnout(g);
        return { rank: index.rankOf(g.id), name: g.ar, t: tg, band: band(tg) };
      }),
      map: countryMap(index.ranked),
    };
  }
  const g = index.get(key)!,
    t = turnout(g),
    cv = turnoutCurve(g.hours, g.reg),
    wilayat = wilayatStats(g);
  return {
    ...base,
    kind: 'gov',
    band: band(t),
    split: SPLIT_GOV,
    turnout: t,
    voted: g.voted,
    reg: g.reg,
    gender: genderOf(g),
    name: g.ar,
    rank: index.rankOf(key),
    delta: t - nat.turnout,
    share: nat.voted ? (g.voted / nat.voted) * 100 : 0,
    wilCount: g.wil.length,
    curve: curve(cv.vals, t),
    hours: hourLabels(cv.from, cv.to, 3),
    wilayat,
    region: regionShape(key, wilayat),
    locator: locator(key),
  };
}

export function refreshSlide(old: TvSlide, next: TvSlide): TvSlide {
  if (old.kind === 'nat' && next.kind === 'nat') {
    const regions = new Map(next.map.regions.map((r) => [r.id, r])),
      labels = new Map(next.map.labels.map((l) => [l.id, l]));
    return {
      ...next,
      uid: old.uid,
      map: {
        ...next.map,
        id: old.map.id,
        regions: old.map.regions.map((o) => ({ ...(regions.get(o.id) ?? o), k: o.k, pts: o.pts })),
        labels: old.map.labels.map((o) => {
          const n = labels.get(o.id) ?? o;
          return { ...o, t: n.t, name: n.name, wilCount: n.wilCount };
        }),
      },
    };
  }
  if (old.kind === 'gov' && next.kind === 'gov') {
    const cols = next.region.columns,
      oldCols = old.region.columns;
    return {
      ...next,
      uid: old.uid,
      curve: { ...next.curve, id: old.curve.id },
      region: {
        ...next.region,
        id: old.region.id,
        dots: old.region.dots,
        columns: cols && oldCols ? { ...cols, id: oldCols.id } : cols,
      },
    };
  }
  return { ...next, uid: old.uid };
}
