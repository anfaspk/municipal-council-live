import { rng } from '../../../../shared/ui/ornament';

export const STEPS = ['civil', 'face', 'pass', 'swipe', 'send'] as const;
export type Step = (typeof STEPS)[number];
export type Screen = 'home' | Step;
export type Seg = '' | 'on' | 'done';

const DUR: Record<Screen, number> = {
  home: 1800,
  civil: 3200,
  face: 3000,
  pass: 2800,
  swipe: 2800,
  send: 3400,
};
export const OK: Record<Step, number> = {
  civil: 2400,
  face: 2200,
  pass: 1900,
  swipe: 2100,
  send: 2700,
};
export const START: Record<Step, number> = (() => {
  const s = {} as Record<Step, number>;
  let t = DUR.home;
  for (const k of STEPS) {
    s[k] = t;
    t += DUR[k];
  }
  return s;
})();
export const LOOP = START.send + DUR.send;
const TAP: readonly [number, number] = [1100, 1800];
const HOLD = 1200;
const BEAM: readonly [number, number] = [START.send + 300, START.send + 500 + 2 * 300 + 1200];

export interface BallotFrame {
  screen: Screen;
  run: readonly boolean[];
  ok: readonly boolean[];
  seg: readonly Seg[];
  tapped: boolean;
  beam: boolean;
  fly: boolean;
}

export function ballotAt(t: number, first: boolean): BallotFrame {
  const left = !first && t < HOLD;
  let screen: Screen = 'home';
  for (const k of STEPS) if (t >= START[k]) screen = k;
  const run = STEPS.map((k) => left || t >= START[k]);
  const ok = STEPS.map((k) => left || t >= START[k] + OK[k]);
  const at = screen === 'home' ? -1 : STEPS.indexOf(screen);
  const seg = STEPS.map((_, i): Seg => {
    if (at < 0 || i > at) return '';
    return i < at || ok[i] ? 'done' : 'on';
  });
  return {
    screen,
    run,
    ok,
    seg,
    tapped: t >= TAP[0] && t < TAP[1],
    beam: t >= BEAM[0] && t < BEAM[1],
    fly: t >= START.send,
  };
}

export const BALLOT_STILL: BallotFrame = {
  screen: 'send',
  run: STEPS.map(() => true),
  ok: STEPS.map(() => true),
  seg: STEPS.map((): Seg => 'done'),
  tapped: false,
  beam: false,
  fly: false,
};

export function frameKey(f: BallotFrame): string {
  return [
    f.screen,
    f.run.map(Number).join(''),
    f.ok.map(Number).join(''),
    f.seg.join(','),
    +f.tapped,
    +f.beam,
    +f.fly,
  ].join('|');
}

export interface Line {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
}
export interface Spot {
  x: string;
  y: string;
}
export interface Tower {
  right: string;
  left: string;
  top: string;
  leds: Line[];
  delay: string;
}
export interface BallotArt {
  ticks: Line[];
  base: string;
  towers: Tower[];
  mesh: { delay: string; dots: Spot[] }[];
  code: Spot[];
  dust: { x: string; y: string; delay: string }[];
  sparks: string;
}

export const RING_R = 62;

export function ballotArt(seed = 4026): BallotArt {
  const rnd = rng(seed),
    f = (n: number) => n.toFixed(1);
  const ticks: Line[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2,
      r1 = 74,
      r2 = i % 5 ? 71 : 68;
    ticks.push({
      x1: f(80 + Math.sin(a) * r1),
      y1: f(80 - Math.cos(a) * r1),
      x2: f(80 + Math.sin(a) * r2),
      y2: f(80 - Math.cos(a) * r2),
    });
  }
  const xy = (x: number, y: number, z: number): [string, string] => [
    f(40 + (x - y) * 0.866),
    f(50 + (x + y) * 0.5 - z),
  ];
  const pt = (x: number, y: number, z: number) => xy(x, y, z).join(',');
  const quad = (...p: string[]) => p.join(' ');
  const T = [
    { x: -9, y: -9, h: 25 },
    { x: 9, y: -11, h: 19 },
    { x: -11, y: 9, h: 17 },
    { x: 8, y: 8, h: 22 },
  ].sort((p, q) => p.x + p.y - (q.x + q.y));
  const towers = T.map(({ x, y, h }, i): Tower => {
    const a = 5.5,
      leds: Line[] = [];
    for (let z = 4; z < h - 2; z += 4) {
      const [x1, y1] = xy(x - a + 1.6, y + a, z),
        [x2, y2] = xy(x - a + 5.2, y + a, z);
      leds.push({ x1, y1, x2, y2 });
    }
    return {
      right: quad(
        pt(x + a, y - a, 0),
        pt(x + a, y + a, 0),
        pt(x + a, y + a, h),
        pt(x + a, y - a, h),
      ),
      left: quad(
        pt(x - a, y + a, 0),
        pt(x + a, y + a, 0),
        pt(x + a, y + a, h),
        pt(x - a, y + a, h),
      ),
      top: quad(pt(x - a, y - a, h), pt(x + a, y - a, h), pt(x + a, y + a, h), pt(x - a, y + a, h)),
      leds,
      delay: (i * 0.75).toFixed(2) + 's',
    };
  });
  const mesh: BallotArt['mesh'] = [];
  for (let my = 13; my <= 37; my += 3.4) {
    const dots: Spot[] = [];
    for (let mx = 13; mx <= 35; mx += 3.4) {
      const ex = (mx - 24) / 10.5,
        ey = (my - 25) / 13;
      if (ex * ex + ey * ey <= 1) dots.push({ x: f(mx), y: f(my) });
    }
    if (dots.length) mesh.push({ delay: (((my - 13) / 24) * 0.9).toFixed(2) + 's', dots });
  }
  const code: Spot[] = [];
  for (let cy = 0; cy < 5; cy++)
    for (let cx = 0; cx < 6; cx++)
      if (rnd() < 0.55 || (cy === 0 && cx === 0))
        code.push({ x: f(6 + cx * 4.6), y: f(25 + cy * 4.6) });
  const dust = Array.from({ length: 12 }, (_, d) => {
    const a = (d / 12) * Math.PI * 2;
    return {
      x: (Math.cos(a) * 22).toFixed(0) + 'px',
      y: (Math.sin(a) * 18).toFixed(0) + 'px',
      delay: (d * 0.03).toFixed(2) + 's',
    };
  });
  const sparks = Array.from({ length: 10 }, () => {
    const a = rnd() * Math.PI * 2,
      d = 24 + rnd() * 30,
      at = (Math.cos(a) * d).toFixed(0) + 'px ' + (Math.sin(a) * d * 0.4).toFixed(0) + 'px';
    return at + ' 0 0 var(--mv-c), ' + at + ' 6px 0 var(--mv-c)';
  }).join(', ');
  const base = quad(pt(-22, -22, 0), pt(22, -22, 0), pt(22, 22, 0), pt(-22, 22, 0));
  return { ticks, base, towers, mesh, code, dust, sparks };
}
