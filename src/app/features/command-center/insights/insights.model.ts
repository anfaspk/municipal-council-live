import { t } from '../../../core/i18n/i18n';
import { fmt, name, pct, pctNum, pctOf } from '../../../domain/format';
import { Age, AGE_BANDS, ageLabel, AgeRow } from '../../../domain/stats/age';
import { Gov, Hour } from '../../../domain/stats/stats';
import { Band, band, turnout } from '../../../domain/stats/turnout';

export interface Scope {
  g: Gov | null;
  total: number;
  m: number;
  f: number;
  hours: Hour[];

  ages?: Age | null;
}

export const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export const WILAYAT_SHOWN = 6;
const hourLabel = (h: number) => (h < 10 ? '0' : '') + h + ':00';
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);

const perHour = (hours: Hour[], k: 'm' | 'f') =>
  HOURS.map((h) => {
    const x = hours.find((y) => y.h === h);
    return x ? x[k] : 0;
  });

export interface GenRow {
  hour: string;
  m: number;
  f: number;
  mw: string;
  fw: string;
  mPeak: boolean;
  fPeak: boolean;
}
export interface GenView {
  m: number;
  f: number;

  mPeak: string;
  fPeak: string;

  ms: number;
  gap: string;
  rows: GenRow[];
}

export function genView(s: Scope): GenView {
  const mh = perHour(s.hours, 'm'),
    fh = perHour(s.hours, 'f');

  const mx = Math.max(1, Math.max(...mh), Math.max(...fh)),
    pm = mh.indexOf(Math.max(...mh)),
    pf = fh.indexOf(Math.max(...fh));
  const ms = s.total ? (s.m / s.total) * 100 : 50,
    gap = ms - (100 - ms);
  return {
    m: s.m,
    f: s.f,
    mPeak: t('peak') + ' ' + hourLabel(HOURS[pm]!),
    fPeak: t('peak') + ' ' + hourLabel(HOURS[pf]!),
    ms,
    gap:
      t('gap') +
      ' ' +
      (gap >= 0 ? '+' : '−') +
      pctNum(Math.abs(gap)) +
      ' ' +
      t(gap >= 0 ? 'male' : 'female'),
    rows: HOURS.map((h, i) => {
      const m = mh[i]!,
        f = fh[i]!;
      return {
        hour: hourLabel(h),
        m,
        f,
        mw: ((m / mx) * 100).toFixed(2) + '%',
        fw: ((f / mx) * 100).toFixed(2) + '%',
        mPeak: i === pm,
        fPeak: i === pf,
      };
    }),
  };
}

export interface WilRank {
  id: string;
  name: string;
  sub: string;
  reg: number;
  voted: number;
  t: number;
  band: Band;
}
export interface WilView {
  ref: number;
  refLabel: string;

  rows: (WilRank | null)[];
}

export function wilView(s: Scope, govs: readonly Gov[]): WilView {
  const rank = (g: Gov) =>
    g.wils.map((r) => ({
      id: g.id + ':' + r.id,
      name: r.name,
      sub: name(g),
      reg: r.reg,
      voted: r.voted,
      t: r.reg ? (r.voted / r.reg) * 100 : 0,
    }));
  let list: Omit<WilRank, 'band'>[], ref: number, refLabel: string;
  if (s.g) {
    list = rank(s.g);
    ref = turnout(s.g);
    refLabel = t('ixGovAvg', { p: pct(ref) });
  } else {
    list = govs.flatMap(rank);
    const sv = sum(govs.map((g) => g.voted)),
      sr = sum(govs.map((g) => g.reg));
    ref = sr ? (sv / sr) * 100 : 0;
    refLabel = t('natAvg', { p: pct(ref) });
  }
  list.sort((a, b) => b.t - a.t);
  const rows = Array.from({ length: WILAYAT_SHOWN }, (_, i) =>
    list[i] ? { ...list[i], band: band(list[i].t) } : null,
  );
  return { ref, refLabel, rows };
}

export function agesOf(govs: readonly Gov[]): Age | null {
  if (!govs.length || govs.some((g) => !g.ages)) return null;
  return AGE_BANDS.map((band, i): AgeRow => {
    const add = (k: 'v' | 'm' | 'f') =>
      govs.reduce<number | null>((s, g) => {
        const x = g.ages![i]?.[k] ?? null;
        return s === null || x === null ? null : s + x;
      }, 0);
    return { band, v: add('v'), m: add('m'), f: add('f') };
  });
}

export interface AgeCol {
  label: string;

  m: string;
  f: string;
  km: number;
  kf: number;

  share: string;
  ks: number;
  top: boolean;
  aria: string;
}
export interface AgeView {
  cols: AgeCol[];

  ticks: string[];

  top: number;
  head: string;
}

const ltr = (s: string) => '\u2066' + s + '\u2069';

function axisTop(n: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  return [1, 2, 2.5, 5, 10].find((k) => k * p >= n)! * p;
}

export function ageView(s: Scope): AgeView {
  const ages = s.ages ?? null,
    rows = AGE_BANDS.map((band, i) => ages?.[i] ?? { band, v: null, m: null, f: null }),
    vOf = (r: AgeRow) => r.v ?? (r.m === null || r.f === null ? null : r.m + r.f),
    known = rows.every((r) => vOf(r) !== null),
    all = known ? rows.reduce((n, r) => n + vOf(r)!, 0) : 0,
    peak = Math.max(0, ...rows.map((r) => Math.max(r.m ?? 0, r.f ?? 0))),
    max = peak > 0 ? axisTop(peak) : 1,
    k = (x: number | null) => (x === null ? 0 : Math.min(1, x / max)),
    dash = (n: number | null) => (n === null ? '—' : fmt(n));

  let top = -1;
  if (all > 0) rows.forEach((r, i) => (top < 0 || vOf(r)! > vOf(rows[top]!)! ? (top = i) : 0));
  const topV = top < 0 ? 0 : vOf(rows[top]!)!;
  return {
    cols: rows.map((r, i) => {
      const v = vOf(r),
        label = ageLabel(r.band),
        share = all > 0 && v !== null ? pctOf(v, all) : '—';
      return {
        label,
        m: dash(r.m),
        f: dash(r.f),
        km: k(r.m),
        kf: k(r.f),
        share,
        ks: topV > 0 && v !== null ? Math.min(1, v / topV) : 0,
        top: i === top,
        aria: t('ixAgeL', { b: ltr(label), m: dash(r.m), f: dash(r.f), s: share }),
      };
    }),
    ticks: all > 0 ? [0, 1, 2, 3, 4].map((j) => fmt((max * j) / 4)) : [],
    top,
    head:
      top >= 0
        ? t('ixAgeTop', { b: ltr(ageLabel(rows[top]!.band)) })
        : t(ages && known ? 'ixAgeNone' : 'ixAgeWait'),
  };
}
