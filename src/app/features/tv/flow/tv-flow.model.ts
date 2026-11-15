import { GEO } from '../../../domain/geo/geo.data';
import { pctNum } from '../../../domain/format';
import { Band } from '../../../domain/stats/turnout';
import { sparkGeom } from '../../../shared/ui/marks';
import { f2, TvBox } from '../tv-geometry';
import type { GovSlide, NationalSlide } from '../tv-slide.model';

export const PHONE_REGION: TvBox = { w: 190, h: 170, text: 12, hit: 44, bleed: 0, labels: false };
export const PHONE_COUNTRY: TvBox = { w: 196, h: 263, text: 12, hit: 0, bleed: 0, labels: false };
const DOT_MIN = 3.5,
  DOT_ADD = 6,
  RING_PAST = 5;

export interface PhoneMark {
  rank: number;
  x: number;
  y: number;
}
export interface PhoneCountry {
  viewBox: string;
  outline: string;
  regions: { id: string; band: Band; d: string }[];
  marks: PhoneMark[];
}
export function phoneCountry(
  slide: NationalSlide,
  ranks?: ReadonlyMap<string, number>,
): PhoneCountry {
  const regions = slide.map.regions,
    at = (id: string) => GEO.g[id]?.c;
  const mark = (id: string, rank: number): PhoneMark[] => {
    const c = at(id);
    return c ? [{ rank, x: (c[0] / GEO.w) * 100, y: (c[1] / GEO.h) * 100 }] : [];
  };
  return {
    viewBox: '0 0 ' + GEO.w + ' ' + GEO.h,
    outline: GEO.outline,
    regions: regions.map((r) => ({ id: r.id, band: r.band, d: r.d })),
    marks: ranks
      ? regions.flatMap((r) => mark(r.id, ranks.get(r.id) ?? 0))
      : slide.leaders.flatMap((l, k) => mark(regions[k]?.id ?? '', l.rank)),
  };
}

export interface PhonePoint {
  i: number;
  id: number;
  name: string;
  band: Band;
  cx: string;
  cy: string;
  r: string;
  hit: string;
  ring: string;
}
export interface PhoneRegion {
  viewBox: string;
  d: string;
  pts: PhonePoint[];
}
export function phoneRegion(slide: GovSlide, box: TvBox = PHONE_REGION): PhoneRegion {
  const by = new Map(slide.wilayat.map((w) => [w.i, w])),
    most = slide.wilayat.reduce((m, w) => Math.max(m, w.voted), 1);
  const pts = (slide.region.columns?.cols ?? []).flatMap((c): PhonePoint[] => {
    const w = by.get(c.i);
    if (!w) return [];
    const r = DOT_MIN + DOT_ADD * Math.sqrt(Math.max(0, w.voted) / most);
    return [
      {
        i: c.i,
        id: w.id,
        name: w.name,
        band: w.band,
        cx: c.pt.cx,
        cy: c.pt.cy,
        r: f2(r),
        hit: f2(Math.max(box.hit / 2, r)),
        ring: f2(r + RING_PAST),
      },
    ];
  });
  return { viewBox: slide.region.viewBox, d: slide.region.d, pts };
}

export function againstNation(delta: number): { key: string; p: string; up: boolean } {
  if (Math.abs(delta) < 0.005) return { key: 'tvfEven', p: '', up: true };
  return { key: delta > 0 ? 'tvfAbove' : 'tvfBelow', p: pctNum(Math.abs(delta)), up: delta > 0 };
}

export interface StorySegs {
  n: number;
  at: number;
}
export const storySegs = (
  stories: number,
  k: number,
  walk: { n: number; lit: number } | null,
): StorySegs => (walk && walk.n ? { n: walk.n, at: Math.max(0, walk.lit) } : { n: stories, at: k });

export type StoryMove = { to: 'wil'; i: number } | { to: 'story'; k: number };
export function storyStep(
  k: number,
  walk: { n: number; lit: number } | null,
  step: 1 | -1,
): StoryMove {
  if (walk && walk.n) {
    const j = Math.max(0, walk.lit) + step;
    if (j >= 0 && j < walk.n) return { to: 'wil', i: j };
  }
  return { to: 'story', k: k + step };
}

export const segState = (s: number, at: number): 'done' | 'on' | 'todo' =>
  s < at ? 'done' : s === at ? 'on' : 'todo';

export const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;
export const ringDash = (t: number): string =>
  f2((RING_C * Math.min(100, Math.max(0, t))) / 100) + ' ' + f2(RING_C);

export function hoursSpark(
  hours: readonly { h: number; v: number }[],
  w = 340,
  h = 64,
): { d: string; area: string; from: string } | null {
  const rows = hours.filter((x) => x.v > 0).sort((a, b) => a.h - b.h);
  if (!rows.length) return null;
  let acc = 0;
  const cum = rows.map((x) => (acc += x.v)),
    g = sparkGeom(cum, w, h, { min: 0 });
  return { d: g.d, area: g.area, from: String(rows[0]!.h).padStart(2, '0') + ':00' };
}
