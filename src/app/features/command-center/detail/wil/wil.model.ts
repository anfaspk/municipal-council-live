import { r2, short } from '../charts/chart';
import { LABEL_H } from '../region-geometry';

export interface LocBox {
  x: number;
  y: number;
  w: number;
  h: number;
}
const overlaps = (a: LocBox, b: LocBox) =>
  Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;

export function locLabel(
  pin: { x: number; y: number; r: number; name: string },
  w: number,
  h: number,
  avoid?: LocBox,
): LocBox {
  const lw = short(pin.name).length * 7 + 18,
    hh = LABEL_H / 2,
    x = r2(Math.max(4 + lw / 2, Math.min(w - 4 - lw / 2, pin.x))),
    above = pin.y - pin.r - 6 - hh,
    below = r2(Math.min(h - 4 - hh, pin.y + pin.r + 6 + hh)),
    up = { x, y: r2(above), w: lw, h: LABEL_H };
  return above - hh >= 4 && !(avoid && overlaps(up, avoid)) ? up : { ...up, y: below };
}
