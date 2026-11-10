export type Pt = [number, number];
export type Box = [number, number, number, number];

export function pathRings(d: string): Pt[][] {
  return d
    .split('M')
    .filter(Boolean)
    .map((r) => {
      const n = r.replace(/[LZ]/g, ' ').trim().split(/\s+/).map(Number),
        pts: Pt[] = [];
      for (let i = 0; i + 1 < n.length; i += 2) pts.push([n[i]!, n[i + 1]!]);
      return pts;
    });
}

export function insideRings(x: number, y: number, rs: readonly Pt[][]): boolean {
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

export function randomIn(
  rs: readonly Pt[][],
  b: Readonly<Box>,
  random: () => number = Math.random,
): Pt | null {
  for (let i = 0; i < 60; i++) {
    const x = b[0] + random() * (b[2] - b[0]),
      y = b[1] + random() * (b[3] - b[1]);
    if (insideRings(x, y, rs)) return [x, y];
  }
  return null;
}

export function boundsOf(points: Iterable<Readonly<Pt>>): Box {
  const b: Box = [1e9, 1e9, -1e9, -1e9];
  for (const p of points) {
    if (p[0] < b[0]) b[0] = p[0];
    if (p[1] < b[1]) b[1] = p[1];
    if (p[0] > b[2]) b[2] = p[0];
    if (p[1] > b[3]) b[3] = p[1];
  }
  return b;
}
