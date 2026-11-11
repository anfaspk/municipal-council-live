import { FlatCamera, FlatTransform, Size } from '../../../domain/geo/projection';
import { Box, Pt } from '../../../domain/geo/shapes';


export const f1 = (v: number): string => (+v).toFixed(1);
export const f2 = (v: number): string => (+v).toFixed(2);
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const easeIO = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const cosh = (x: number): number => {
  x = Math.exp(x);
  return (x + 1 / x) / 2;
};
const sinh = (x: number): number => {
  x = Math.exp(x);
  return (x - 1 / x) / 2;
};
const tanh = (x: number): number => {
  x = Math.exp(2 * x);
  return (x - 1) / (x + 1);
};
export type View = [cx: number, cy: number, width: number];
export function interpZoom(
  a: Readonly<View>,
  b: Readonly<View>,
): { fn: (t: number) => View; distance: number } {
  const rho = 1.35,
    rho2 = rho * rho,
    rho4 = rho2 * rho2;
  const ux0 = a[0],
    uy0 = a[1],
    w0 = a[2],
    ux1 = b[0],
    uy1 = b[1],
    w1 = b[2],
    dx = ux1 - ux0,
    dy = uy1 - uy0,
    d2 = dx * dx + dy * dy;
  let distance: number, fn: (t: number) => View;
  if (d2 < 1e-9) {
    distance = Math.log(w1 / w0) / rho;
    fn = (t) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * distance)];
  } else {
    const d1 = Math.sqrt(d2),
      b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1),
      b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0),
      r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    distance = (r1 - r0) / rho;
    fn = (t) => {
      const s = t * distance,
        c0 = cosh(r0),
        u = (w0 / (rho2 * d1)) * (c0 * tanh(rho * s + r0) - sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, (w0 * c0) / cosh(rho * s + r0)];
    };
  }
  return { fn, distance: Math.abs(distance) };
}
export const flightMs = (distance: number): number => clamp(distance * 520, 1000, 2300);

export function viewNat(w: number, h: number, stage: Size): FlatCamera {
  const vw = w + 90,
    vh = h + 170,
    k = Math.min(stage.width / vw, stage.height / vh);
  return { cx: w / 2, cy: h / 2 + 38, s: stage.width / k };
}
export function viewGov(b: Box, stage: Size): FlatCamera {
  const bw = Math.max(b[2] - b[0], 8),
    bh = Math.max(b[3] - b[1], 8),
    padX = 1.62,
    padY = 1.5;
  return {
    cx: (b[0] + b[2]) / 2,
    cy: (b[1] + b[3]) / 2 + bh * 0.02,
    s: Math.max(bw * padX, (bh * padY * stage.width) / stage.height, 26),
  };
}
export function viewWil(v: FlatCamera, pt: Pt | null | undefined): FlatCamera {
  if (!pt) return v;
  return { cx: v.cx + (pt[0] - v.cx) * 0.3, cy: v.cy + (pt[1] - v.cy) * 0.3, s: v.s / 1.16 };
}
export function freeSpan(
  face: readonly [number, number],
  stage: readonly [number, number],
  z: number,
  width: number,
  gap = 36,
): [number, number] {
  let x0 = 0,
    x1 = width;
  if (face[0] < stage[1] && face[1] > stage[1]) x1 = (face[0] - stage[0]) * z - gap;
  else if (face[1] > stage[0] && face[0] < stage[0]) x0 = (face[1] - stage[0]) * z + gap;
  return x1 - x0 < width / 3 || x1 > width || x0 < 0 ? [0, width] : [x0, x1];
}
export function inset(v: FlatCamera, stage: Size, span: readonly [number, number]): FlatCamera {
  const w = span[1] - span[0];
  if (w <= 0 || w >= stage.width) return v;
  const s = (v.s * stage.width) / w,
    k = stage.width / s;
  return { cx: v.cx - ((span[0] + span[1]) / 2 - stage.width / 2) / k, cy: v.cy, s };
}

export const camMatrix = (t: FlatTransform): string =>
  'matrix(' + t.k.toFixed(5) + ' 0 0 ' + t.k.toFixed(5) + ' ' + f2(t.tx) + ' ' + f2(t.ty) + ')';
export const screenPath = (rings: readonly Pt[][], t: FlatTransform): string =>
  rings
    .map(
      (r) =>
        'M' + r.map((p) => f1(p[0] * t.k + t.tx) + ' ' + f1(p[1] * t.k + t.ty)).join('L') + 'Z',
    )
    .join('');
export function screenBox(rings: readonly Pt[][], t: FlatTransform): Box {
  const b: Box = [1e9, 1e9, -1e9, -1e9];
  rings.forEach((r) => {
    r.forEach((p) => {
      const x = p[0] * t.k + t.tx,
        y = p[1] * t.k + t.ty;
      if (x < b[0]) b[0] = x;
      if (y < b[1]) b[1] = y;
      if (x > b[2]) b[2] = x;
      if (y > b[3]) b[3] = y;
    });
  });
  return b;
}
export const labelInset = (W: number, H: number): { x: number; y: number } => ({
  x: W * 0.06 + 6,
  y: H * 0.05 + 6,
});
export function lockRect(a: Pt, c: Pt, stage: Size): Box {
  const pad = 34,
    W = stage.width,
    H = stage.height;
  const x0 = clamp(a[0] - pad, 8, W - 60),
    y0 = clamp(a[1] - pad, 76, H - 60),
    x1 = clamp(c[0] + pad, x0 + 60, W - 8),
    y1 = clamp(c[1] + pad, y0 + 60, H - 76);
  return [x0, y0, x1, y1];
}
export function connectorPath(dx: number, dy: number, lw: number, lh: number): string {
  const d = Math.hypot(dx, dy) || 1,
    ex = dx / d,
    ey = dy / d;
  const t = Math.min(
    Math.abs(dx) > 0.1 ? lw / Math.abs(dx) : 1e9,
    Math.abs(dy) > 0.1 ? lh / Math.abs(dy) : 1e9,
  );
  const end = Math.max(24, d * (1 - Math.min(1, t)) - 2);
  return d > 30
    ? 'M' + f1(ex * 22) + ' ' + f1(ey * 22) + 'L' + f1(ex * end) + ' ' + f1(ey * end)
    : '';
}
export const labelAt = (x: number, y: number): string =>
  'translate(' + f1(x) + 'px,' + f1(y) + 'px) translate(-50%,-50%)';
