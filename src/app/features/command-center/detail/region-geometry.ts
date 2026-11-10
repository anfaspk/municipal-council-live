import { Geo, GEO } from '../../../domain/geo/geo.data';
import { layoutCountLabels } from '../../../domain/geo/label-layout';
import { boundsOf, pathRings, Pt } from '../../../domain/geo/shapes';
import { Band, band, turnout } from '../../../domain/stats/turnout';
import { r2, short } from './charts/chart';

export type RegionSource = Pick<Geo, 'g' | 'wilPt'>;
export interface RegionWil {
  id: number;
  name: string;
  reg: number;
  voted: number;
}
export interface RegionPin {
  id: number;
  name: string;
  x: number;
  y: number;
  r: number;
  t: number;
  band: Band;
  reg: number;
  voted: number;
}
export interface RegionLabel {
  id: number;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  lead: string | null;
}
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface RegionGeo {
  w: number;
  h: number;
  d: string;
  ext: number[];
  bounds: Rect;
  lattice: { step: number; d: string };
  scan: Rect & { sy: number };
  sw: number;
  blur: number;
  pins: RegionPin[];
  labels: RegionLabel[];
}

export const REGION_LABELS = 6;
export const LABEL_H = 20;
const LAYERS = 8;

const f1 = (n: number) => n.toFixed(1);

export function regionGeo(
  id: string,
  rows: readonly RegionWil[],
  box: { w: number; h: number },
  geo: RegionSource = GEO,
): RegionGeo | null {
  const g = geo.g[id];
  if (!g || box.w < 40 || box.h < 40) return null;
  const { w, h } = box,
    rings = pathRings(g.d),
    b0 = boundsOf(rings.flat()),
    bw = b0[2] - b0[0],
    bh = b0[3] - b0[1],
    pad = Math.max(12, Math.min(w, h) * 0.08),
    depth = h * 0.04,
    k = Math.min((w - pad * 2) / bw, (h - pad * 2 - depth) / bh),
    ox = (w - bw * k) / 2 - b0[0] * k,
    oy = (h - depth - bh * k) / 2 - b0[1] * k,
    px = (p: Readonly<Pt>): Pt => [p[0] * k + ox, p[1] * k + oy];
  const d = rings.map((r) => 'M' + r.map((p) => px(p).map(f1).join(' ')).join(' L') + 'Z').join(''),
    x0 = b0[0] * k + ox,
    y0 = b0[1] * k + oy,
    sw = bw * k,
    sh = bh * k,
    s = Math.max(sw, sh),
    step = r2(s / 22);

  const by = new Map(rows.map((r) => [r.id, r] as const)),
    pts = (geo.wilPt[id] ?? []).filter((p) => by.has(p.i)),
    top = Math.max(1, ...pts.map((p) => by.get(p.i)!.reg)),
    rMax = Math.min(12, Math.max(7, s * 0.03)),
    rMin = rMax * 0.4;
  const pins = pts
    .map((p): RegionPin => {
      const row = by.get(p.i)!,
        [x, y] = px(p.c),
        t = turnout(row);
      return {
        id: row.id,
        name: row.name,
        x: r2(x),
        y: r2(y),
        r: r2(rMin + (rMax - rMin) * Math.sqrt(Math.max(0, row.reg) / top)),
        t,
        band: band(t),
        reg: row.reg,
        voted: row.voted,
      };
    })
    .sort((a, c) => a.y - c.y || a.id - c.id);

  return {
    w,
    h,
    d,
    ext: Array.from({ length: LAYERS }, (_, i) => r2((depth * (LAYERS - i)) / LAYERS)),
    bounds: { x: r2(x0), y: r2(y0), w: r2(sw), h: r2(sh) },
    lattice: { step, d: 'M' + step + ' 0H0V' + step },
    scan: { x: r2(x0), y: r2(y0 - sh * 0.22), w: r2(sw), h: r2(sh * 0.22), sy: r2(sh * 1.22) },
    sw: r2(Math.max(1, s * 0.005)),
    blur: r2(s * 0.03),
    pins,
    labels: labelsOf(pins, w, h),
  };
}

function labelsOf(pins: readonly RegionPin[], w: number, h: number): RegionLabel[] {
  const chosen = pins
      .slice()
      .sort((a, c) => c.reg - a.reg || a.id - c.id)
      .slice(0, REGION_LABELS),
    items = chosen.map((p) => ({
      x: p.x,
      y: p.y - p.r - LABEL_H / 2 - 4,
      w: short(p.name).length * 7 + 18,
      h: LABEL_H,
    })),
    obstacles = pins.map((p) => ({
      x: p.x,
      y: p.y,
      w: p.r * 2 + 4,
      h: p.r * 2 + 4,
      fixed: 1,
      soft: 1,
    })),
    out = layoutCountLabels([...items, ...obstacles], w, h, { x: 4, y: 4 });
  return chosen.map((p, i): RegionLabel => {
    const L = out[i]!,
      hw = L.w / 2,
      hh = L.h / 2,
      qx = Math.max(L.px - hw, Math.min(p.x, L.px + hw)),
      qy = Math.max(L.py - hh, Math.min(p.y, L.py + hh)),
      far = Math.hypot(L.px - items[i]!.x, L.py - items[i]!.y) > 4;
    return {
      id: p.id,
      name: short(p.name),
      x: r2(L.px),
      y: r2(L.py),
      w: L.w,
      h: L.h,
      lead: far ? 'M' + f1(p.x) + ' ' + f1(p.y) + 'L' + f1(qx) + ' ' + f1(qy) : null,
    };
  });
}
