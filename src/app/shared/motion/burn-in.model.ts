export const BURN_AFTER = 30 * 60_000;
export const BURN_MAX = 4;
export const BURN_STEP = 10_000;
const PERIOD_X = 8 * 60_000;
const PERIOD_Y = 11 * 60_000;

export interface Drift {
  x: number;
  y: number;
}
export const NO_DRIFT: Drift = { x: 0, y: 0 };

export function driftAt(idle: number, still: boolean): Drift {
  if (still || !(idle >= BURN_AFTER)) return NO_DRIFT;
  const t = idle - BURN_AFTER;
  let x = BURN_MAX * Math.sin((2 * Math.PI * t) / PERIOD_X),
    y = BURN_MAX * Math.sin((2 * Math.PI * t) / PERIOD_Y);
  const r = Math.hypot(x, y);
  if (r > BURN_MAX) {
    x = (x * BURN_MAX) / r;
    y = (y * BURN_MAX) / r;
  }
  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
}
