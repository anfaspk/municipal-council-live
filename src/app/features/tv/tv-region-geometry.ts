import { uid } from '../../shared/ui/uid';
import { GEO } from '../../domain/geo/geo.data';
import { Gov } from '../../domain/stats/stats';
import { Band, band } from '../../domain/stats/turnout';
import { fmt } from '../../domain/format';
import {
  Pt,
  f2,
  geoRings,
  geoBox,
  geoPts,
  layoutLabels,
  LayoutItem,
  lifts,
  Lift,
  Ping,
  Rect,
  Ellipse,
  Spot,
} from './tv-geometry-primitives';
export interface WilayatStat {
  id: number;
  name: string;
  voted: number;
  reg: number;
  t: number;
  band: Band;
  rank: number;
  i: number;
}

export function wilayatStats(g: Gov): WilayatStat[] {
  const rows = g.wils.map((r) => {
    const t = r.reg ? (r.voted / r.reg) * 100 : 0;
    return { id: r.id, name: r.name, voted: r.voted, reg: r.reg, t, band: band(t), rank: 0, i: 0 };
  });
  rows
    .sort((a, b) => b.t - a.t)
    .forEach((r, i) => {
      r.rank = i + 1;
      r.i = i;
    });
  return rows;
}

export interface RegionColumn {
  i: number;
  band: Band;
  h: string;
  glow: Ellipse;
  arc: Ellipse;
  body: string;
  cap: Ellipse;
  pt: Spot;
}
export interface RegionLabel {
  i: number;
  band: Band;
  name: string;
  t: number;
  count: string;
  lead: string | null;
  bg: Rect;
  top: Rect;
  nm: Spot;
  pc: Spot;
  ct: Spot;
}
export interface RegionColumns {
  id: string;
  viewBox: string;
  cols: RegionColumn[];
  labels: RegionLabel[];
}
export interface RegionShape {
  id: string;
  viewBox: string;
  d: string;
  ext: Lift[];
  dots: Ping[];
  dot: { ring: string; ringSw: string; core: string };
  grid: Rect;
  scan: Rect & { sy: string };
  pattern: { step: string; d: string; sw: string };
  blur: string;
  traceSw: string;
  cometSw: string;
  pin: Spot & { r: string; sw: string; core: string };
  shock: (Spot & { r: string; sw: string }) | null;
  columns: RegionColumns | null;
}

export const STAGE_W = 727,
  STAGE_H = 732;
const COLUMN_MAX = 140,
  HEADROOM = 170;

export interface RegionPoint {
  id: number;
  at: Pt;
}

export function regionShape(id: string, wil: WilayatStat[]): RegionShape {
  const by = new Map(wil.map((w) => [w.id, w] as const)),
    { shape, points } = regionBase(id, new Set(by.keys()));
  return {
    ...shape,
    columns: points.length
      ? regionColumns(points.map((p) => ({ at: p.at, r: by.get(p.id)! })))
      : null,
  };
}

export function regionBase(
  id: string,
  ids: ReadonlySet<number>,
): { shape: RegionShape; points: RegionPoint[] } {
  const geo = (GEO.wilPt[id] || []).filter((x) => ids.has(x.i));
  const g0 = GEO.g[id]!,
    r0 = geoRings(g0.d),
    b0 = geoBox(r0),
    s0 = Math.max(b0[2] - b0[0], b0[3] - b0[1]),
    pad0 = s0 * 0.1;
  const vb: [number, number, number, number] = [
    b0[0] - pad0,
    b0[1] - pad0,
    b0[2] - b0[0] + pad0 * 2,
    b0[3] - b0[1] + pad0 * 2 + s0 * 0.045,
  ];
  if (geo.length) {
    const k0 = Math.min(STAGE_W / vb[2], STAGE_H / vb[3]);
    let e = HEADROOM / k0;
    if (STAGE_H / (vb[3] + e) < STAGE_W / vb[2]) e = (HEADROOM * vb[3]) / (STAGE_H - HEADROOM);
    vb[1] -= e;
    vb[3] += e;
  }
  const k = Math.min(STAGE_W / vb[2], STAGE_H / vb[3]),
    ex = (STAGE_W - vb[2] * k) / 2 - vb[0] * k,
    ey = (STAGE_H - vb[3] * k) / 2 - vb[1] * k;
  const px = (p: Pt): Pt => [p[0] * k + ex, p[1] * k + ey];
  const d = r0
    .map(
      (r) =>
        'M' +
        r
          .map((p) => {
            const q = px(p);
            return q[0].toFixed(1) + ' ' + q[1].toFixed(1);
          })
          .join(' L') +
        'Z',
    )
    .join('');
  const c = px(g0.c),
    rs = geoRings(d),
    b = geoBox(rs),
    w = b[2] - b[0],
    h = b[3] - b[1],
    s = Math.max(w, h);
  const step = s / 26,
    sw = s * 0.0042;
  const dots = geoPts(rs, b, 16).map((p, i): Ping => ({
    cx: f2(p[0]),
    cy: f2(p[1]),
    d: (1.6 + i * 0.09).toFixed(2) + 's',
    p: (2.2 + (i % 5) * 0.45).toFixed(2) + 's',
  }));
  const shape: RegionShape = {
    id: uid('tvs'),
    viewBox: [0, 0, STAGE_W, STAGE_H].map(f2).join(' '),
    d,
    ext: lifts(9, s * 0.045),
    dots,
    dot: { ring: f2(s * 0.022), ringSw: f2(sw * 0.7), core: f2(s * 0.0065) },
    grid: { x: f2(b[0]), y: f2(b[1]), w: f2(w), h: f2(h) },
    scan: {
      x: f2(b[0]),
      y: f2(b[1] - h * 0.22),
      w: f2(w),
      h: f2(h * 0.22),
      sy: f2(h * 1.22) + 'px',
    },
    pattern: { step: f2(step), d: 'M' + f2(step) + ' 0H0V' + f2(step), sw: f2(sw * 0.35) },
    blur: f2(s * 0.03),
    traceSw: f2(sw),
    cometSw: f2(sw * 2.2),
    pin: { cx: f2(c[0]), cy: f2(c[1]), r: f2(s * 0.05), sw: f2(sw), core: f2(s * 0.014) },
    shock: geo.length
      ? { cx: f2((b[0] + b[2]) / 2), cy: f2((b[1] + b[3]) / 2), r: f2(s * 0.62), sw: f2(sw * 1.4) }
      : null,
    columns: null,
  };
  return { shape, points: geo.map((x) => ({ id: x.i, at: px(x.c) })) };
}

function regionColumns(pts: { at: Pt; r: WilayatStat }[]): RegionColumns {
  const cl = pts.map((x) => ({
    r: x.r,
    X: x.at[0],
    Y: x.at[1],
    h: (COLUMN_MAX * x.r.t) / 100,
    T: x.at[1] - (COLUMN_MAX * x.r.t) / 100,
  }));
  let dmin = 1e9;
  cl.forEach((a, i) => {
    cl.forEach((o, j) => {
      if (j > i) dmin = Math.min(dmin, Math.hypot(a.X - o.X, (a.Y - o.Y) * 1.6));
    });
  });
  const cw = Math.max(9, Math.min(17, dmin * 0.32)),
    ry = cw * 0.4;
  const cols = cl
    .slice()
    .sort((a, o) => a.Y - o.Y)
    .map(({ r, X, Y, h, T }): RegionColumn => ({
      i: r.i,
      band: r.band,
      h: f2(h) + 'px',
      glow: { cx: f2(X), cy: f2(Y), rx: f2(cw * 2.1), ry: f2(ry * 2.1) },
      arc: { cx: f2(X), cy: f2(Y), rx: f2(cw * 1.3), ry: f2(ry * 1.3) },
      body:
        'M' +
        f2(X - cw) +
        ' ' +
        f2(Y) +
        'V' +
        f2(T) +
        'A' +
        f2(cw) +
        ' ' +
        f2(ry) +
        ' 0 0 0 ' +
        f2(X + cw) +
        ' ' +
        f2(T) +
        'V' +
        f2(Y) +
        'A' +
        f2(cw) +
        ' ' +
        f2(ry) +
        ' 0 0 1 ' +
        f2(X - cw) +
        ' ' +
        f2(Y) +
        'Z',
      cap: { cx: f2(X), cy: f2(T), rx: f2(cw), ry: f2(ry) },
      pt: { cx: f2(X), cy: f2(Y) },
    }));
  const lab = cl.map((o) => {
    const count = fmt(o.r.voted) + ' / ' + fmt(o.r.reg),
      w = Math.max(o.r.name.length * 8, 84, count.length * 7.4) + 30,
      h = 76;
    return { r: o.r, X: o.X, Y: o.T, count, w, h, x: o.X, y: o.T - h / 2 - 18 } as LayoutItem & {
      r: WilayatStat;
      X: number;
      Y: number;
      count: string;
    };
  });
  const obstacles: LayoutItem[] = cl.map((o) => ({
    fixed: 1,
    soft: 1,
    x: o.X,
    y: (o.T + o.Y) / 2,
    w: cw * 2 + 6,
    h: o.Y - o.T + ry * 2 + 6,
  }));
  obstacles.push({ fixed: 1, x: 62, y: 82, w: 150, h: 210 });
  layoutLabels([...lab, ...obstacles], STAGE_W, STAGE_H);
  const labels = lab
    .sort((a, o) => a.r.i - o.r.i)
    .map((L): RegionLabel => {
      const cx = L.px!,
        cy = L.py!,
        hw = L.w / 2,
        hh = L.h / 2;
      const qx = Math.max(cx - hw, Math.min(L.X, cx + hw)),
        qy = Math.max(cy - hh, Math.min(L.Y, cy + hh));
      return {
        i: L.r.i,
        band: L.r.band,
        name: L.r.name,
        t: L.r.t,
        count: L.count,
        lead:
          Math.hypot(qx - L.X, qy - L.Y) > 4
            ? 'M' + f2(L.X) + ' ' + f2(L.Y) + 'L' + f2(qx) + ' ' + f2(qy)
            : null,
        bg: { x: f2(cx - hw), y: f2(cy - hh), w: f2(hw * 2), h: f2(hh * 2) },
        top: { x: f2(cx - hw + 14), y: f2(cy - hh), w: f2(hw * 2 - 28), h: '2' },
        nm: { cx: f2(cx), cy: f2(cy - hh + 22) },
        pc: { cx: f2(cx), cy: f2(cy + 13) },
        ct: { cx: f2(cx), cy: f2(cy + hh - 11) },
      };
    });
  return { id: uid('tvk'), viewBox: '0 0 ' + STAGE_W + ' ' + STAGE_H, cols, labels };
}
