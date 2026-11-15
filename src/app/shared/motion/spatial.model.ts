export type Dir = 'left' | 'right' | 'up' | 'down';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const ACROSS = 3;
const OFF_LINE = 1e6;

export const DIRS: Readonly<Record<string, Dir>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};
export const dirOf = (key: string): Dir | null => (Object.hasOwn(DIRS, key) ? DIRS[key]! : null);

export function nearest(from: Box, boxes: readonly Box[], dir: Dir): number {
  const fx = from.x + from.w / 2,
    fy = from.y + from.h / 2,
    horiz = dir === 'left' || dir === 'right',
    sign = dir === 'right' || dir === 'down' ? 1 : -1;
  let best = -1,
    bestScore = Infinity,
    bestAlong = Infinity;
  boxes.forEach((b, i) => {
    if (b === from || b.w <= 0 || b.h <= 0) return;
    const cx = b.x + b.w / 2,
      cy = b.y + b.h / 2;
    const along = ((horiz ? cx : cy) - (horiz ? fx : fy)) * sign;
    if (along <= 0.5) return;
    const across = Math.abs(horiz ? cy - fy : cx - fx),
      inLine = horiz
        ? b.y < from.y + from.h && b.y + b.h > from.y
        : b.x < from.x + from.w && b.x + b.w > from.x,
      score = along + across * ACROSS + (inLine ? 0 : OFF_LINE);
    if (!inLine && along < across) return;
    if (score < bestScore - 0.01 || (Math.abs(score - bestScore) <= 0.01 && along < bestAlong)) {
      best = i;
      bestScore = score;
      bestAlong = along;
    }
  });
  return best;
}

export function first(boxes: readonly Box[], rtl: boolean): number {
  let best = -1;
  boxes.forEach((b, i) => {
    if (b.w <= 0 || b.h <= 0) return;
    if (best < 0) return void (best = i);
    const a = boxes[best]!;
    const row = Math.abs(b.y - a.y) < Math.min(a.h, b.h) / 2;
    if (row ? (rtl ? b.x + b.w > a.x + a.w : b.x < a.x) : b.y < a.y) best = i;
  });
  return best;
}
