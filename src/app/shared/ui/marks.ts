export function ringGeom(p: number, size: number, sw: number) {
  const r = (size - sw) / 2,
    c = 2 * Math.PI * r;
  return {
    size,
    half: size / 2,
    r,
    dash: ((c * p) / 100).toFixed(2) + ' ' + c.toFixed(2),
    rot: 'rotate(-90 ' + size / 2 + ' ' + size / 2 + ')',
    text: Math.round(p),
  };
}
export function sparkGeom(
  vals: number[],
  w: number,
  h: number,
  o: { min?: number; max?: number } = {},
) {
  let mn = o.min != null ? o.min : Math.min(...vals),
    mx = o.max != null ? o.max : Math.max(...vals);
  if (mx === mn) {
    mx += 1;
    mn -= 1;
  }
  const pad = 3,
    n = vals.length;
  const pts = vals.map((v, i): [number, number] => [
    (n > 1 ? i / (n - 1) : 1) * (w - pad * 2) + pad,
    h - pad - ((v - mn) / (mx - mn)) * (h - pad * 2),
  ]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '),
    last = pts[n - 1]!;
  return {
    d,
    area: d + ' L' + last[0].toFixed(1) + ' ' + h + ' L' + pad + ' ' + h + 'Z',
    cx: last[0].toFixed(1),
    cy: last[1].toFixed(1),
  };
}
