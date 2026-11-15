import type { Geo } from '../../../domain/geo/geo.data';
import type { FlatCamera, Size } from '../../../domain/geo/projection';
import { viewGov, viewWil } from '../stage/stage-camera';
import type { Place } from './count-flow.model';

const PAD = 1.08;
export const PIN_R = 6;
export const PIN_LIT = 1.6;

export function flyView(geo: Geo, p: Place, size: Size): FlatCamera {
  const g = p.k === 'nat' ? undefined : geo.g[p.gid];
  if (!g || size.width <= 0 || size.height <= 0)
    return {
      cx: geo.w / 2,
      cy: geo.h / 2,
      s: Math.max(geo.w * PAD, (geo.h * PAD * size.width) / Math.max(1, size.height)),
    };
  const v = viewGov(g.b, size);
  if (p.k !== 'wil') return v;
  return viewWil(v, geo.wilPt[p.gid]?.find((x) => x.i === p.wid)?.c);
}

export const pinR = (cam: FlatCamera, size: Size, lit: boolean): number =>
  (PIN_R * (lit ? PIN_LIT : 1) * cam.s) / Math.max(1, size.width);
