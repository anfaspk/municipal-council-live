import { pts as ptsText } from '../../../domain/format';
import { ranksOf } from '../../../domain/rank';
import { Gov, Village } from '../../../domain/stats/stats';
import { Band, BANDS, band, turnout } from '../../../domain/stats/turnout';


export type Tab = 'ov' | 'wil' | 'vil';
export const TABS: readonly Tab[] = ['ov', 'wil', 'vil'];
export type SortKey = 'turnout' | 'votes' | 'name';

export interface DRow {
  id: number;
  name: string;
  reg: number;
  voted: number;
  t: number;
  rank: number;
  vil: Village[] | null;
}

export function dRows(
  g: Gov,
  vil: (wid: number) => Village[] | undefined = () => undefined,
): DRow[] {
  const rows = g.wils.map((r) => ({
    id: r.id,
    name: r.name,
    reg: r.reg,
    voted: r.voted,
    t: turnout(r),
    rank: 0,
    vil: vil(r.id) ?? null,
  }));
  const rank = ranksOf(rows, (r) => r.t);
  rows.forEach((r, i) => {
    r.rank = rank[i]!;
  });
  return rows;
}

export const dTop = (rows: readonly DRow[]): DRow | undefined =>
  rows.slice().sort((a, b) => b.t - a.t)[0];

export function dSort<X extends { voted: number; t: number }>(
  list: readonly X[],
  how: SortKey,
  nm: (x: X) => string,
): X[] {
  return list
    .slice()
    .sort((a, b) =>
      how === 'votes'
        ? b.voted - a.voted
        : how === 'name'
          ? nm(a).localeCompare(nm(b), 'ar')
          : b.t - a.t,
    );
}

export function villageList(list: readonly Village[], how: SortKey, q: string): Village[] {
  const s = q.trim().toLowerCase();
  return dSort(list, how, (v) => v.ar).filter((v) => !s || v.ar.toLowerCase().indexOf(s) > -1);
}

export function bandCounts(list: readonly Village[] | null): Record<Band, number> {
  const cnt: Record<Band, number> = { high: 0, mid: 0, low: 0 };
  (list || []).forEach((v) => {
    cnt[band(v.t)]++;
  });
  return cnt;
}
export const BANDS_DOWN: readonly Band[] = BANDS.slice().reverse();

export const tabDir = (from: Tab, to: Tab): number =>
  (TABS.indexOf(to) > TABS.indexOf(from) ? 1 : -1) * -1;

export function tabKey(from: Tab, key: string): Tab | null {
  const i = TABS.indexOf(from);
  const k =
    key === 'ArrowLeft'
      ? i + 1
      : key === 'ArrowRight'
        ? i - 1
        : key === 'Home'
          ? 0
          : key === 'End'
            ? TABS.length - 1
            : null;
  return k === null ? null : TABS[(k + TABS.length) % TABS.length]!;
}

export const deltaText = (d: number, pts: string, what: string): string =>
  ptsText(d) + ' ' + pts + ' ' + what;
