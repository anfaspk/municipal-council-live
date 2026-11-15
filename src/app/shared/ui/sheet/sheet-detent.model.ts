export type Detent = 'peek' | 'half' | 'full';
export type DetentHeights = Readonly<Record<Detent, number>>;

export const DETENTS: readonly Detent[] = ['peek', 'half', 'full'];
export const PEEK_SHARE = 0.28;
export const HALF_SHARE = 0.55;
export const PEEK_MIN = 160;
export const SNAP_FLICK = 0.5;

export function detentHeights(content: number, room: number): DetentHeights {
  const c = Math.max(0, content),
    r = Math.max(0, room),
    full = Math.min(c, r),
    half = Math.min(full, Math.round(r * HALF_SHARE)),
    peek = Math.min(half, Math.max(PEEK_MIN, Math.round(r * PEEK_SHARE)));
  return { peek, half, full };
}

export function distinct(h: DetentHeights): Detent[] {
  const out: Detent[] = [];
  for (const d of DETENTS) if (!out.some((o) => h[o] === h[d])) out.push(d);
  return out;
}

function settle(d: Detent, h: DetentHeights): Detent {
  return [...DETENTS].reverse().find((x) => h[x] === h[d]) ?? d;
}

export function snapOf(at: number, v: number, h: DetentHeights): Detent | 'closed' {
  const list = distinct(h).map((d) => settle(d, h));
  if (!list.length) return 'closed';
  if (at < h.peek / 2) return 'closed';
  if (Math.abs(v) >= SNAP_FLICK) {
    if (v > 0) {
      const below = list.filter((d) => h[d] < at);
      return below.length ? below[below.length - 1]! : 'closed';
    }
    return list.find((d) => h[d] > at) ?? list[list.length - 1]!;
  }
  return list.reduce((best, d) => (Math.abs(h[d] - at) < Math.abs(h[best] - at) ? d : best));
}

export function stepOf(d: Detent, h: DetentHeights): Detent | 'closed' {
  const list = distinct(h).map((x) => settle(x, h)),
    at = list.indexOf(settle(d, h));
  return at < 0 || at === list.length - 1 ? 'closed' : list[at + 1]!;
}

export const modalAt = (d: Detent): boolean => d !== 'peek';
