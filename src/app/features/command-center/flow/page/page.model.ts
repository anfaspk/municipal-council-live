import { pctNum } from '../../../../domain/format';
import type { Hour } from '../../../../domain/stats/stats';
import { clamp, r2 } from '../../detail/charts/chart';
import type { RankRow } from '../../detail/charts/ranked.model';
import type { Crumb } from '../../detail/detail.model';
import type { DetailLevel } from '../../detail/detail-url';
import { type Compare, type Gender, type Side, sideOf } from '../../detail/parts/place.model';

export type PageTab = 'wil' | 'hours' | 'ages' | 'gender' | 'vils' | 'loc' | 'cmp' | 'rate';
export const PAGE_TABS: Readonly<Record<DetailLevel, readonly PageTab[]>> = {
  gov: ['wil', 'hours', 'ages', 'gender'],
  wil: ['vils', 'loc', 'hours', 'ages', 'gender'],
  vil: ['cmp', 'rate', 'gender'],
};
export type TabChoice = Readonly<Partial<Record<DetailLevel, PageTab>>>;
export const tabOf = (level: DetailLevel, kept: TabChoice): PageTab => {
  const t = kept[level];
  return t && PAGE_TABS[level].includes(t) ? t : PAGE_TABS[level][0]!;
};
export function tabStep(level: DetailLevel, on: PageTab, key: string): PageTab | null {
  const list = PAGE_TABS[level],
    i = list.indexOf(on),
    n = list.length;
  if (key === 'Home') return list[0]!;
  if (key === 'End') return list[n - 1]!;
  if (key === 'ArrowLeft') return list[(i + 1) % n]!;
  if (key === 'ArrowRight') return list[(i - 1 + n) % n]!;
  return null;
}

export interface PhoneCrumb extends Crumb {
  full: string | null;
}
export function phoneCrumbs(list: readonly Crumb[]): PhoneCrumb[] {
  const plain = (c: Crumb): PhoneCrumb => ({ ...c, full: null });
  if (list.length <= 3) return list.map(plain);
  const mid = list.slice(1, -2),
    near = mid[mid.length - 1]!;
  return [
    plain(list[0]!),
    { ...near, label: '…', full: mid.map((c) => c.label).join(' › ') },
    ...list.slice(-2).map(plain),
  ];
}

export interface CmpChip {
  label: string;
  side: Side;
  gap: string;
}
export function cmpChips(c: Compare): CmpChip[] {
  const self = c.rows.find((r) => r.key === 'self');
  if (!self || self.t === null) return [];
  return c.rows
    .filter((r) => r.key !== 'self' && r.t !== null)
    .map((r) => {
      const d = self.t! - r.t!;
      return { label: r.label, side: sideOf(d), gap: pctNum(Math.abs(d)) };
    });
}

export interface HourCol {
  h: number;
  label: string;
  time: string;
  v: number;
  k: number;
  peak: boolean;
}
export interface Hours {
  cols: HourCol[];
  peak: HourCol | null;
}
const two = (h: number) => (h % 24 < 10 ? '0' : '') + (h % 24);
export function hoursView(hours: readonly Hour[]): Hours {
  if (!hours.length) return { cols: [], peak: null };
  const from = Math.min(...hours.map((x) => x.h)),
    to = Math.max(...hours.map((x) => x.h)),
    raw = Array.from({ length: to - from + 1 }, (_, i) => {
      const h = from + i;
      return { h, v: hours.find((x) => x.h === h)?.v ?? 0 };
    }),
    max = Math.max(1, ...raw.map((x) => x.v)),
    cols = raw.map((x): HourCol => ({
      ...x,
      label: two(x.h),
      time: two(x.h) + ':00',
      k: r2(clamp(x.v / max, 0, 1)),
      peak: false,
    }));
  const peak = cols.reduce<HourCol | null>((a, c) => (c.v > 0 && (!a || c.v > a.v) ? c : a), null);
  if (peak) peak.peak = true;
  return { cols, peak };
}

export interface GenderSay {
  key: 'flPgGenM' | 'flPgGenF' | 'flPgGenEven';
  n: string;
}
export function genderSay(g: Gender): GenderSay | null {
  const m = g.rate.m.t,
    f = g.rate.f.t;
  if (m === null || f === null) return null;
  const d = m - f;
  if (Math.abs(d) < 0.005) return { key: 'flPgGenEven', n: '' };
  return { key: d > 0 ? 'flPgGenM' : 'flPgGenF', n: pctNum(Math.abs(d)) };
}

export type PageSort = 'turnout' | 'low' | 'votes' | 'name';
export const LIST_SORTS: readonly PageSort[] = ['turnout', 'votes', 'name'];
export const VIL_SORTS: readonly PageSort[] = ['turnout', 'low', 'votes', 'name'];
export function lowFirst<K>(rows: readonly RankRow<K>[]): RankRow<K>[] {
  const out: RankRow<K>[] = [];
  for (let i = rows.length - 1; i >= 0;) {
    let j = i;
    while (j > 0 && rows[j - 1]!.t === rows[i]!.t) j--;
    out.push(...rows.slice(j, i + 1));
    i = j - 1;
  }
  return out;
}
