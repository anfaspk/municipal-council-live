
export type Pt = [number, number];
type Rings = Pt[][];
type Box = [number, number, number, number];

export const f2 = (v: number): string => (+v).toFixed(2);

export function geoRings(d: string): Rings {
  return d
    .split('M')
    .filter(Boolean)
    .map((r) => {
      const nums = r.replace(/[LZ]/g, ' ').trim().split(/\s+/).map(Number),
        pts: Pt[] = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i]!, nums[i + 1]!]);
      return pts;
    });
}
export function geoBox(rs: Rings): Box {
  const b: Box = [1e9, 1e9, -1e9, -1e9];
  rs.forEach((r) => {
    r.forEach((p) => {
      b[0] = Math.min(b[0], p[0]);
      b[1] = Math.min(b[1], p[1]);
      b[2] = Math.max(b[2], p[0]);
      b[3] = Math.max(b[3], p[1]);
    });
  });
  return b;
}
export function geoIn(x: number, y: number, rs: Rings): boolean {
  let c = false;
  rs.forEach((r) => {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const p = r[i]!,
        q = r[j]!;
      if (p[1] > y !== q[1] > y && x < ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]) + p[0]) c = !c;
    }
  });
  return c;
}
export function geoPts(rs: Rings, b: Box, want: number, rand: () => number = Math.random): Pt[] {
  const pts: Pt[] = [],
    gap = Math.sqrt(((b[2] - b[0]) * (b[3] - b[1])) / want) * 0.55;
  let tries = 0;
  while (pts.length < want && tries < 1500) {
    tries++;
    const x = b[0] + rand() * (b[2] - b[0]),
      y = b[1] + rand() * (b[3] - b[1]);
    if (!geoIn(x, y, rs) || pts.some((q) => Math.hypot(q[0] - x, q[1] - y) < gap)) continue;
    pts.push([x, y]);
  }
  return pts;
}

export interface LayoutItem {
  x: number;
  y: number;
  w: number;
  h: number;
  px?: number;
  py?: number;
  fixed?: number;
  soft?: number;
}
export function layoutLabels(items: LayoutItem[], width: number, height: number): void {
  const gap = 8,
    M2 = 14;
  items.forEach((it) => {
    it.px = it.x;
    it.py = it.y;
  });
  for (let n = 0; n < 1000; n++) {
    let moved = false;
    for (let i = 0; i < items.length; i++)
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!,
          c = items[j]!,
          ox = (a.w + c.w) / 2 + gap - Math.abs(a.px! - c.px!),
          oy = (a.h + c.h) / 2 + gap - Math.abs(a.py! - c.py!);
        if (ox <= 0 || oy <= 0 || (a.fixed && c.fixed) || (n > 500 && (a.soft || c.soft))) continue;
        moved = true;
        const wa = a.fixed ? 0 : c.fixed ? 1 : 0.5,
          wc = 1 - wa;
        if (ox < oy * 1.25) {
          const sx = (a.px! < c.px! || (a.px === c.px && i < j) ? -1 : 1) * ox;
          a.px! += sx * wa;
          c.px! -= sx * wc;
        } else {
          const sy = (a.py! < c.py! || (a.py === c.py && i < j) ? -1 : 1) * oy;
          a.py! += sy * wa;
          c.py! -= sy * wc;
        }
      }
    items.forEach((it) => {
      if (it.fixed) return;
      if (n > 40 && n < 600) {
        it.px! += (it.x - it.px!) * 0.015;
        it.py! += (it.y - it.py!) * 0.015;
      }
      it.px = Math.max(it.w / 2 - M2, Math.min(width - it.w / 2 + M2, it.px!));
      it.py = Math.max(it.h / 2 - M2, Math.min(height - it.h / 2 + M2, it.py!));
    });
    if (!moved && n > 40) break;
  }
}

export interface Lift {
  transform: string;
  i: number;
}
export interface Ping {
  cx: string;
  cy: string;
  d: string;
  p: string;
}
export interface Rect {
  x: string;
  y: string;
  w: string;
  h: string;
}
export interface Ellipse {
  cx: string;
  cy: string;
  rx: string;
  ry: string;
}
export interface Spot {
  cx: string;
  cy: string;
}

export function lifts(n: number, depth: number): Lift[] {
  const out: Lift[] = [];
  for (let i = n; i >= 1; i--)
    out.push({ transform: 'translate(0 ' + f2((depth * i) / n) + ')', i: n - i });
  return out;
}

