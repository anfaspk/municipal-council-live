import { uid } from '../../shared/ui/uid';
import { GEO } from '../../domain/geo/geo.data';
import { Gov } from '../../domain/stats/stats';
import { Band, band, turnout } from '../../domain/stats/turnout';
import {
  f2,
  geoRings,
  geoBox,
  geoPts,
  layoutLabels,
  LayoutItem,
  lifts,
  Lift,
  Ping,
  Spot,
} from './tv-geometry-primitives';
export interface CountryRegion {
  id: string;
  k: number;
  band: Band;
  d: string;
  wil: { id: number; cx: number; cy: number; q: number }[];
  pts: Ping[];
}
export interface CountryLabel {
  id: string;
  k: number;
  x: string;
  y: string;
  y2: string;
  y3: string;
  t: number;
  name: string;
  wilCount: number;
}
export interface CountryMap {
  id: string;
  viewBox: string;
  outline: string;
  ext: Lift[];
  regions: CountryRegion[];
  labels: CountryLabel[];
}

const LAB_LINE2 = 17,
  LAB_LINE3 = 32,
  labBox = (name: string): { w: number; h: number } => ({
    w: Math.max(56, name.length * 7.8) + 12,
    h: LAB_LINE3 + 18,
  });

export function countryMap(ranked: readonly Gov[]): CountryMap {
  const depth = 14,
    regions: CountryRegion[] = [],
    labels: CountryLabel[] = [],
    boxes: LayoutItem[] = [];
  ranked.forEach((g, k) => {
    const geo = GEO.g[g.id]!,
      t = turnout(g),
      rs = geoRings(geo.d);
    const pts = geoPts(rs, geoBox(rs), Math.max(2, Math.min(7, Math.round(Math.sqrt(g.reg) / 70))));
    regions.push({
      id: g.id,
      k,
      band: band(t),
      d: geo.d,
      wil: (GEO.wilPt[g.id] || []).map((x, q) => ({ id: x.i, cx: x.c[0], cy: x.c[1], q })),
      pts: pts.map((p, i) => ({
        cx: f2(p[0]),
        cy: f2(p[1]),
        d: (2 + k * 0.1 + i * 0.07).toFixed(2) + 's',
        p: (2.4 + (i % 4) * 0.5).toFixed(2) + 's',
      })),
    });
    labels.push({
      id: g.id,
      k,
      x: '',
      y: '',
      y2: '',
      y3: '',
      t,
      name: g.ar,
      wilCount: g.wil.length,
    });
    boxes.push({ x: geo.c[0], y: geo.c[1] - 13 + labBox(g.ar).h / 2, ...labBox(g.ar) });
  });
  layoutLabels(boxes, GEO.w, GEO.h);
  labels.forEach((l, i) => {
    const b = boxes[i]!,
      y = b.py! - b.h / 2 + 13;
    l.x = f2(b.px!);
    l.y = f2(y);
    l.y2 = f2(y + LAB_LINE2);
    l.y3 = f2(y + LAB_LINE3);
  });
  return {
    id: uid('tvo'),
    viewBox: '-20 -20 640 ' + f2(GEO.h + 40 + depth),
    outline: GEO.outline,
    ext: lifts(6, depth),
    regions,
    labels,
  };
}

export interface Locator {
  viewBox: string;
  regions: { id: string; d: string; on: boolean }[];
  ping: Spot;
}

export function locator(id: string): Locator {
  const c = GEO.g[id]!.c;
  return {
    viewBox: '-10 -10 620 ' + f2(GEO.h + 20),
    regions: Object.entries(GEO.g).map(([k, g]) => ({ id: k, d: g.d, on: k === id })),
    ping: { cx: f2(c[0]), cy: f2(c[1]) },
  };
}
