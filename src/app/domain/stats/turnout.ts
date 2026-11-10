import { Base, BaseField, Hour, sumHours } from './stats';

export type Band = 'low' | 'mid' | 'high';
export interface Counted {
  voted: number;
  reg: number;
}
export interface National {
  population: number;
  registered: number;
  regM: number;
  regF: number;
  voted: number;
  votedM: number;
  votedF: number;
  turnout: number;
  hours: Hour[];
  unread: readonly BaseField[];
}

export const turnout = (g: Counted): number => (g.reg ? (g.voted / g.reg) * 100 : 0);
export const BANDS: readonly Band[] = ['low', 'mid', 'high'];
export const band = (t: number): Band => (t < 50 ? 'low' : t < 70 ? 'mid' : 'high');
const bandRange: Record<Band, [number, number]> = {
  low: [40, 50],
  mid: [50, 70],
  high: [70, 95],
};
const intensity = (t: number): number => {
  const r = bandRange[band(t)];
  return Math.max(0, Math.min(1, (t - r[0]) / (r[1] - r[0])));
};
export const bandFill = (t: number): string => {
  const b = band(t),
    k = intensity(t);
  return (
    'color-mix(in oklab, var(--band-' + b + ') ' + Math.round(55 + 45 * k) + '%, var(--canvas-1))'
  );
};
export const ranked = <G extends Counted>(govs: readonly G[]): G[] =>
  govs.slice().sort((a, b) => turnout(b) - turnout(a));

export function nationalOf(
  govs: (Counted & { votedM: number; votedF: number; hours: Hour[] })[],
  b: Base,
): National {
  let v = 0,
    vm = 0,
    vf = 0;
  govs.forEach((g) => {
    v += g.voted;
    vm += g.votedM;
    vf += g.votedF;
  });
  return {
    population: b.population,
    registered: b.registered,
    regM: b.regM,
    regF: b.regF,
    voted: v,
    votedM: vm,
    votedF: vf,
    turnout: turnout({ voted: v, reg: b.registered }),
    hours: sumHours(govs.map((g) => g.hours)),
    unread: b.unread,
  };
}
