export type Gesture = 'swipe-next' | 'swipe-prev' | 'swipe-down' | 'hold' | 'none';

export interface TrackPoint {
  x: number;
  y: number;
  t: number;
}

export interface GestureOpts {
  rtl: boolean;
  vw: number;
}

export const AXIS_LOCK = 10;
export const EDGE = 24;
export const SWIPE_DIST = 60;
export const FLICK_DIST = 20;
export const FLICK_SPEED = 0.5;
export const FLICK_WINDOW = 100;
export const HOLD_MS = 500;

export function axisOf(track: readonly TrackPoint[]): 'x' | 'y' | null {
  const a = track[0];
  if (!a) return null;
  for (const p of track) {
    const dx = p.x - a.x,
      dy = p.y - a.y;
    if (Math.hypot(dx, dy) > AXIS_LOCK) return Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
  }
  return null;
}

export const fromEdge = (p: TrackPoint, vw: number): boolean => p.x < EDGE || p.x > vw - EDGE;

export function holding(track: readonly TrackPoint[], now: number): boolean {
  const a = track[0];
  return !!a && now - a.t >= HOLD_MS && axisOf(track) === null;
}

export function speedOf(track: readonly TrackPoint[], axis: 'x' | 'y'): number {
  const b = track[track.length - 1]!;
  let a = b;
  for (let i = track.length - 1; i >= 0; i--) {
    a = track[i]!;
    if (b.t - a.t >= FLICK_WINDOW) break;
  }
  const dt = b.t - a.t;
  return dt > 0 ? (b[axis] - a[axis]) / dt : 0;
}

export function gestureOf(track: readonly TrackPoint[], o: GestureOpts): Gesture {
  const a = track[0],
    b = track[track.length - 1];
  if (!a || !b || fromEdge(a, o.vw)) return 'none';
  const axis = axisOf(track);
  if (!axis) return b.t - a.t >= HOLD_MS ? 'hold' : 'none';
  const d = b[axis] - a[axis],
    v = speedOf(track, axis),
    far = Math.abs(d) >= SWIPE_DIST || (Math.abs(d) >= FLICK_DIST && Math.abs(v) >= FLICK_SPEED);
  if (!far) return 'none';
  if (axis === 'y') return d > 0 ? 'swipe-down' : 'none';
  return d > 0 === o.rtl ? 'swipe-next' : 'swipe-prev';
}
