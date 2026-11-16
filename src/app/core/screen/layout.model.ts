import type { Screen } from './screen-prefs';

export type Form = 'stage' | 'flow';
export type Tier = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
export type Display = 'browser' | 'standalone' | 'fullscreen';

export interface LayoutEnv {
  vw: number;
  vh: number;
  zoom: number;
  screen: Screen;
  forced: Form | null;
  held?: Form | null;
  coarse: boolean;
  display: Display;
}

export interface Layout {
  form: Form;
  tier: Tier;
  scale: number;
  frameW: number;
  frameH: number | null;
  aspect: number;
  short: boolean;
  tight: boolean;
  scroll: boolean;
}

export type Ready = ReadonlyMap<Screen, 'phone' | 'all'>;
export const FLOW_READY: Ready = new Map([
  ['dashboard', 'all'],
  ['tv', 'all'],
  ['wall', 'all'],
  ['draw', 'all'],
  ['winners', 'all'],
]);

export type ScreenComp = 'phone' | 'tab' | 'sign';
export function screenComp(vw: number, vh: number, anyCoarse: boolean): ScreenComp {
  if (vw < 600 || (vw > vh && vh < 500)) return 'phone';
  return vh > vw && vw >= 900 && !anyCoarse ? 'sign' : 'tab';
}

export interface LayoutFlags {
  floor: boolean;
  ceiling: boolean;
}
export const LAYOUT_FLAGS: LayoutFlags = { floor: true, ceiling: true };

export const DESIGN_W = 1920;
export const DESIGN_H = 1080;
const STAGE_MIN = { w: 900, h: 500 };
const DASH_MIN = { w: 1152, h: 648 };
const LANDSCAPE = 1.2;
export const BAND_W = 48;
export const BAND_H = 32;
const BAND_ASPECT = 0.05;
const COARSE_UP_TO = 1366;
const FLOOR = 0.8;
const CEILING = 1.2;
const CEILING_BELOW = 3200;
const MAX_ASPECT = 21 / 9;
const TIGHT_H = 880;

const STEPS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.1, 1.2, 1.25, 1.33, 1.5, 1.7, 1.75, 2, 2.4, 2.5, 3, 4, 5,
];

export function zoomOf(outerWidth: number, innerWidth: number): number {
  if (!outerWidth || !innerWidth) return 1;
  const r = outerWidth / innerWidth;
  return STEPS.find((s) => Math.abs(r - s) / s < 0.012) ?? 1;
}

export function fullscreenOffered(enabled: boolean, display: Display, on: boolean): boolean {
  return enabled && (on || display === 'browser');
}

export function parseForm(search: string): Form | null {
  let f: string | null;
  try {
    f = new URLSearchParams(search).get('form');
  } catch {
    return null;
  }
  return f === 'stage' || f === 'flow' ? f : null;
}

export function pointerKind(e: { pointerType: string }): 'touch' | 'pen' | 'mouse' {
  return e.pointerType === 'touch' || e.pointerType === 'pen' ? e.pointerType : 'mouse';
}

export type Fx = 'full' | 'lite';
export const LITE_BELOW = 900;
export function fxOf(form: Form, vw: number, coarse: boolean, saveData: boolean): Fx {
  return saveData || (form === 'flow' && coarse && vw < LITE_BELOW) ? 'lite' : 'full';
}

export function layoutOf(
  env: LayoutEnv,
  ready: Ready = FLOW_READY,
  prev?: Form,
  flags: LayoutFlags = LAYOUT_FLAGS,
): Layout {
  return formOf(env, ready, prev) === 'stage' ? stageOf(env, flags) : flowOf(env, ready);
}

export function formOf(env: LayoutEnv, ready: Ready = FLOW_READY, prev?: Form): Form {
  const built = ready.get(env.screen),
    keep = prev === 'stage';
  if (!built) return 'stage';
  const pinned = env.forced ?? env.held;
  if (pinned) return pinned;
  if (env.screen === 'dashboard' && env.coarse && env.vw <= COARSE_UP_TO) return 'flow';
  const min = env.screen === 'dashboard' ? DASH_MIN : STAGE_MIN;
  return env.vw >= min.w - (keep ? BAND_W : 0) &&
    env.vh >= min.h - (keep ? BAND_H : 0) &&
    env.vw / env.vh >= LANDSCAPE - (keep ? BAND_ASPECT : 0)
    ? 'stage'
    : 'flow';
}

function stageOf(env: LayoutEnv, flags: LayoutFlags): Layout {
  const dash = env.screen === 'dashboard',
    browser = env.display === 'browser',
    base = Math.min(env.vw / DESIGN_W, env.vh / DESIGN_H),
    floor = dash && flags.floor && !env.forced && base < FLOOR;
  let scale = base;
  if (dash && flags.ceiling && browser && env.vw < CEILING_BELOW) scale = Math.min(scale, CEILING);
  scale *= dash ? env.zoom : 1;
  if (floor) scale = Math.max(scale, FLOOR);
  const minW = floor ? env.vw / FLOOR : DESIGN_W,
    minH = floor ? env.vh / FLOOR : DESIGN_H,
    height = Math.max(minH, env.vh / scale);
  let width = Math.max(minW, env.vw / scale);
  if (flags.ceiling && browser) width = Math.min(width, Math.max(minW, height * MAX_ASPECT));
  return {
    form: 'stage',
    tier: width >= 2400 ? 'xxl' : width >= 1920 ? 'xl' : 'lg',
    scale,
    frameW: width,
    frameH: height,
    aspect: env.vw / env.vh,
    short: height < DESIGN_H - 0.5,
    tight: height < TIGHT_H,
    scroll: width * scale > env.vw + 0.5 || height * scale > env.vh + 0.5,
  };
}

function flowOf(env: LayoutEnv, ready: Ready): Layout {
  const tier: Tier =
    ready.get(env.screen) === 'phone' || env.vw < 600 ? 'xs' : env.vw < 900 ? 'sm' : 'md';
  return {
    form: 'flow',
    tier,
    scale: 1,
    frameW: env.vw,
    frameH: env.screen === 'dashboard' ? null : env.vh,
    aspect: env.vw / env.vh,
    short: false,
    tight: false,
    scroll: false,
  };
}
