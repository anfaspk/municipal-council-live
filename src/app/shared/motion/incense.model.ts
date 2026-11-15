export interface Mote {
  x: number;
  y: number;
  s: number;
  v: number;
  p: number;
}

export const FRAME_60 = 1000 / 60;
export const MAX_STEP = 100;

export const backingScale = (dpr: number, frameScale: number): number =>
  Math.min(2, Math.max(0.25, dpr * frameScale));

export const stepOf = (last: number | null, now: number): number =>
  last === null ? FRAME_60 : Math.max(0, Math.min(now - last, MAX_STEP));

export function rise(parts: Mote[], dt: number, random: () => number): void {
  const k = dt / FRAME_60;
  for (const q of parts) {
    q.y -= q.v * k;
    if (q.y < -0.05) {
      q.y = 1.05;
      q.x = random();
    }
  }
}
