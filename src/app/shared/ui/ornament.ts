
export function starPoints(cx: number, cy: number, R: number): string {
  const r = R * 0.7654,
    p: string[] = [];
  for (let i = 0; i < 16; i++) {
    const a = ((i * 22.5 - 90) * Math.PI) / 180,
      rr = i % 2 ? r : R;
    p.push((cx + rr * Math.cos(a)).toFixed(2) + ',' + (cy + rr * Math.sin(a)).toFixed(2));
  }
  return p.join(' ');
}

export const rng = (seed?: number): (() => number) => {
  let s = seed! >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
};
