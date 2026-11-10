import { f1 } from './stage/stage-camera';


export function natWalk(
  count: number,
  sec: number,
): {
  step: number;
  length: number;
  off: number;
  start: (k: number) => number;
} {
  const step = Math.max(2600, sec * 550),
    length = count * step + 4200;
  return { step, length, off: count * step, start: (k) => 2200 + k * length };
}

export function govWalk(
  wilayat: number,
  sec: number,
): { per: number; hold: number; back: number; length: number; start: (k: number) => number } {
  const per = sec * 1000,
    hold = Math.max(4500, per),
    back = hold + wilayat * per,
    length = back + 3600;
  return { per, hold, back, length, start: (k) => 2400 + k * length };
}

export function revealMask(ox: number, oy: number, r: number, fe: number): string {
  return (
    'radial-gradient(circle at ' +
    f1(ox) +
    'px ' +
    f1(oy) +
    'px,#000 ' +
    f1(Math.max(0, r - fe)) +
    'px,rgba(0,0,0,.4) ' +
    f1(Math.max(0, r - fe * 0.35)) +
    'px,transparent ' +
    f1(Math.max(1, r)) +
    'px)'
  );
}
export const revealStart = (ox: number, oy: number): string =>
  'radial-gradient(circle at ' + f1(ox) + 'px ' + f1(oy) + 'px,transparent 0,transparent 1px)';
export const revealRadius = (ox: number, oy: number, W: number, H: number): number =>
  Math.hypot(Math.max(ox, W - ox), Math.max(oy, H - oy)) + 40;
