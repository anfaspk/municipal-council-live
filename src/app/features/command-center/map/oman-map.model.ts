import { Size, ViewBox } from '../../../domain/geo/projection';
import { Box, Pt } from '../../../domain/geo/shapes';
import { Gov } from '../../../domain/stats/stats';
import { Band } from '../../../domain/stats/turnout';


export const SIDE_LAYERS = 7;
export const LABEL_OFFSET: Readonly<Record<string, readonly [number, number]>> = {
  3: [84, 0],
  2: [-96, -56],
  4: [-92, 22],
  10: [0, -72],
  1: [72, -56],
  11: [78, 42],
  7: [22, -16],
  6: [-22, 26],
};

export type MapViewBox = [x: number, y: number, width: number, height: number];
export const mapViewBox0 = (w: number, h: number): MapViewBox => [-24, -56, w + 48, h + 90];
export function lerpViewBox(out: MapViewBox, a: ViewBox, b: ViewBox, t: number): void {
  for (let i = 0; i < 4; i++) out[i] = a[i]! + (b[i]! - a[i]!) * t;
}

export const extrusion = (turnout: number): number => 6 + (Math.max(0, turnout - 40) / 55) * 30;

export interface WilPoint {
  id: number;
  name: string;
  t: number;
}
export const wilPoints = (g: Gov): WilPoint[] =>
  g.wils.map((r) => ({ id: r.id, name: r.name, t: r.reg ? (r.voted / r.reg) * 100 : 0 }));

export const sideFill = (b: Band, last: boolean): string =>
  'color-mix(in oklab, var(--band-' + b + ') ' + (last ? 70 : 52) + '%, #02040c)';

const state = (hot: boolean, pinned: boolean): string =>
  (hot ? ' is-hot' : '') + (pinned ? ' is-pinned' : '');
export const regionClass = (b: Band, hot: boolean, pinned: boolean): string =>
  'rg ' + b + state(hot, pinned);
export const labelClass = (b: Band, hot: boolean, pinned: boolean, callout: boolean): string =>
  'om-lab ' + b + state(hot, pinned) + (callout ? ' callout' : '');

const NO_OFFSET = [0, 0] as const;
export const labelOffset = (id: string): readonly [number, number] => LABEL_OFFSET[id] ?? NO_OFFSET;
export const leadPath = (c: Readonly<Pt>, h: number, ax: number, ay: number): string =>
  'M' + c[0] + ' ' + (c[1] - h).toFixed(1) + ' L' + ax.toFixed(1) + ' ' + ay.toFixed(1);

export function drillViewBox(
  vb0: ViewBox,
  bounds: Readonly<Box> | null,
  points: readonly Readonly<Pt>[],
): MapViewBox {
  if (!bounds) return [...vb0];
  const b: Box = [...bounds];
  points.forEach((c) => {
    b[0] = Math.min(b[0], c[0]);
    b[1] = Math.min(b[1], c[1]);
    b[2] = Math.max(b[2], c[0]);
    b[3] = Math.max(b[3], c[1]);
  });
  let w = b[2] - b[0],
    h = b[3] - b[1];
  const pad = Math.max(w, h) * 0.2 + 10,
    cx = (b[0] + b[2]) / 2,
    cy = (b[1] + b[3]) / 2 - 6;
  w += pad * 2;
  h += pad * 2;
  const minW = vb0[2] / 6,
    minH = vb0[3] / 6;
  if (w < minW && h < minH) {
    const f = Math.min(minW / w, minH / h);
    w *= f;
    h *= f;
  }
  return [cx - w / 2, cy - h / 2, w, h];
}
export function zoomOf(v: ViewBox, vb0: ViewBox, size: Size): number {
  const W = size.width || 1,
    H = size.height || 1;
  return Math.min(W / v[2], H / v[3]) / Math.min(W / vb0[2], H / vb0[3]);
}
