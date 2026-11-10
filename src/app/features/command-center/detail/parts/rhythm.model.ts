import { fmt, pct } from '../../../../domain/format';
import { Hour } from '../../../../domain/stats/stats';
import { Box, lineOf, niceMax, Pt, r2, ticksOf } from '../charts/chart';

export interface RhythmSeries {
  hours: readonly Hour[];
  reg: number;
}
export interface RhythmBar {
  h: number;
  label: string;
  x: number;
  w: number;
  y0: number;
  ym: number;
  yf: number;
  v: number;
  m: number;
  f: number;
  t: number | null;
  peak: boolean;
}
export interface EndLabel {
  x: number;
  y: number;
  text: string;
}
export interface Rhythm {
  bars: RhythmBar[];
  peak: RhythmBar | null;
  left: number;
  right: number;
  top: number;
  bottom: number;
  yTicks: { v: string; y: number }[];
  pTicks: { v: string; y: number }[];
  xLabels: { x: number; label: string }[];
  line: string;
  area: string;
  ref: string;
  end: EndLabel | null;
  refEnd: EndLabel | null;
}

const PAD = { l: 52, r: 18, t: 34, b: 28 };
const steps = (max: number): number => [4, 5, 2, 1].find((n) => Number.isInteger(max / n)) ?? 1;
export const hourLabel = (h: number): string => (h % 24 < 10 ? '0' : '') + (h % 24) + ':00';

function cumulative(s: RhythmSeries, from: number, to: number): (number | null)[] {
  const out: (number | null)[] = [];
  let acc = 0;
  for (let h = from; h < to; h++) {
    acc += s.hours.find((x) => x.h === h)?.v ?? 0;
    out.push(s.reg > 0 ? (acc / s.reg) * 100 : null);
  }
  return out;
}

export function rhythmModel(s: RhythmSeries, ref: RhythmSeries | null, box: Box): Rhythm {
  const left = PAD.l,
    right = Math.max(left, box.w - PAD.r),
    top = PAD.t,
    bottom = Math.max(top, box.h - PAD.b),
    empty: Rhythm = {
      bars: [],
      peak: null,
      left,
      right,
      top,
      bottom,
      yTicks: [],
      pTicks: [],
      xLabels: [],
      line: '',
      area: '',
      ref: '',
      end: null,
      refEnd: null,
    };
  if (!s.hours.length || right - left < 40 || bottom - top < 40) return empty;
  const all = [...s.hours, ...(ref?.hours ?? [])],
    from = Math.min(...all.map((x) => x.h)),
    to = Math.max(...all.map((x) => x.h)) + 1,
    n = to - from,
    step = (right - left) / n,
    xAt = (h: number) => left + (h - from) * step,
    cum = cumulative(s, from, to),
    rcum = ref ? cumulative(ref, from, to) : [];
  const raw = Array.from({ length: n }, (_, i) => {
      const h = from + i,
        x = s.hours.find((y) => y.h === h);
      return { h, v: x?.v ?? 0, m: x?.m ?? 0, f: x?.f ?? 0, t: cum[i] ?? null };
    }),
    max = niceMax(Math.max(...raw.map((p) => Math.max(p.v, p.m + p.f)))),
    yAt = (v: number) => r2(bottom - (v / max) * (bottom - top)),
    bw = Math.min(46, step * 0.64);
  const bars = raw.map((p): RhythmBar => ({
    ...p,
    label: hourLabel(p.h),
    x: r2(xAt(p.h) + (step - bw) / 2),
    w: r2(bw),
    y0: r2(bottom),
    ym: yAt(p.m),
    yf: yAt(p.m + p.f),
    peak: false,
  }));
  const peak = bars.reduce<RhythmBar | null>(
    (a, b) => (b.v > 0 && (!a || b.v > a.v) ? b : a),
    null,
  );
  if (peak) peak.peak = true;

  const tops = [...cum, ...rcum].filter((x): x is number => x !== null),
    pmax = Math.max(10, Math.ceil(Math.max(0, ...tops) / 10) * 10),
    pAt = (p: number) => r2(bottom - (p / pmax) * (bottom - top)),
    pts = (c: (number | null)[]): Pt[] | null =>
      c.some((x) => x === null)
        ? null
        : [[xAt(from), bottom], ...c.map((p, i): Pt => [xAt(from + i + 1), pAt(p!)])],
    own = pts(cum),
    theirs = ref ? pts(rcum) : null,
    endOf = (p: Pt[] | null, t: number | null): EndLabel | null =>
      p && t !== null
        ? { x: r2(p[p.length - 1]![0]), y: r2(p[p.length - 1]![1]), text: pct(t) }
        : null,
    every = n > 12 ? 3 : n > 6 ? 2 : 1;
  return {
    bars,
    peak,
    left,
    right: r2(right),
    top,
    bottom: r2(bottom),
    yTicks: ticksOf(max, steps(max)).map((v) => ({ v: fmt(v), y: yAt(v) })),
    pTicks: ticksOf(pmax, 2).map((v) => ({ v: v + '%', y: pAt(v) })),
    xLabels: bars
      .filter((_, i) => i % every === 0)
      .map((b) => ({ x: r2(b.x + b.w / 2), label: b.label })),
    line: own ? lineOf(own) : '',
    area: own ? lineOf(own) + ` L${r2(own[own.length - 1]![0])} ${r2(bottom)}Z` : '',
    ref: theirs ? lineOf(theirs) : '',
    end: endOf(own, cum[n - 1] ?? null),
    refEnd: endOf(theirs, rcum[n - 1] ?? null),
  };
}
