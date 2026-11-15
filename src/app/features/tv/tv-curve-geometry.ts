import { uid } from '../../shared/ui/uid';
import { f2, Pt, Spot, TvBox } from './tv-geometry-primitives';
export interface Curve {
  id: string;
  grid: string[];
  line: string;
  area: string;
  head: Spot;
}
export const CURVE_W = 360,
  CURVE_H = 104;

export function curve(
  vals: number[],
  t: number,
  box: Pick<TvBox, 'w' | 'h'> = { w: CURVE_W, h: CURVE_H },
): Curve {
  const W = box.w,
    H = box.h,
    mx = Math.max(100, t),
    n = vals.length - 1;
  const p = vals.map((y, i): Pt => [(i / n) * W, H - (y / mx) * H]);
  const line = p.map((q, i) => (i ? 'L' : 'M') + f2(q[0]) + ' ' + f2(q[1])).join(' '),
    last = p[n]!;
  return {
    id: uid('tvc'),
    grid: [25, 50, 75].map((g) => f2(H - (g / mx) * H)),
    line,
    area: line + ' L' + W + ' ' + H + ' L0 ' + H + 'Z',
    head: { cx: f2(last[0]), cy: f2(last[1]) },
  };
}
