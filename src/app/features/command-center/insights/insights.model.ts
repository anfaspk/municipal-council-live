import { t } from '../../../core/i18n/i18n';
import { name, pct, pctNum } from '../../../domain/format';
import { Gov, Hour } from '../../../domain/stats/stats';
import { Band, band, turnout } from '../../../domain/stats/turnout';

export interface Scope {
  g: Gov | null;
  total: number;
  m: number;
  f: number;
  hours: Hour[];
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
