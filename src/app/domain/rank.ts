export function ranksOf<T>(list: readonly T[], value: (x: T) => number): number[] {
  const order = list.map((x, i) => ({ v: value(x), i })).sort((a, b) => b.v - a.v),
    out = new Array<number>(list.length);
  order.forEach((o, k) => {
    const prev = order[k - 1];
    out[o.i] = prev && o.v === prev.v ? out[prev.i]! : k + 1;
  });
  return out;
}
