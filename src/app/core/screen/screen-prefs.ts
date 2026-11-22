export type Screen = 'dashboard' | 'tv' | 'wall' | 'winners' | 'draw';
export type Rotation = 'auto' | 'pinned';
export const NAT = 'nat';
export const SCREEN_KEY = 'majlis.screen';

export interface ScreenPrefs {
  region: string;
  rotation: Rotation;
}
export interface ScreenBoot {
  screen?: Screen;
  region?: string;
  wil?: number;
}
export const SCREEN_DEFAULTS: ScreenPrefs = { region: NAT, rotation: 'auto' };

const BOOT_SCREENS: readonly string[] = ['tv', 'wall', 'winners', 'draw'];
const URL_NAMES: Partial<Record<Screen, string>> = {
  tv: 'statistics',
  wall: 'counting',
  winners: 'winner',
  draw: 'draw',
};
const ALL = 'all';
function screenOfName(v: string | null): Screen | null {
  if (v === null) return null;
  const s = (Object.keys(URL_NAMES) as Screen[]).find((k) => URL_NAMES[k] === v);
  return s ?? (BOOT_SCREENS.includes(v) ? (v as Screen) : null);
}
const WIL_SCREENS: readonly string[] = ['wall', 'winners'];

export function isRegion(v: unknown, govs: readonly string[]): v is string {
  return typeof v === 'string' && (v === NAT || govs.includes(v));
}

export function parseScreenPrefs(raw: string | null, govs: readonly string[]): ScreenPrefs {
  let p: unknown;
  try {
    p = JSON.parse(raw || '{}');
  } catch {
    return { ...SCREEN_DEFAULTS };
  }
  const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
  const region = Object.hasOwn(o, 'region') ? o['region'] : undefined,
    rotation = Object.hasOwn(o, 'rotation') ? o['rotation'] : undefined;
  return {
    region: isRegion(region, govs) ? region : NAT,
    rotation: rotation === 'pinned' ? 'pinned' : 'auto',
  };
}

export function parseScreenBoot(
  search: string,
  govs: readonly string[],
  wils: readonly number[] = [],
): ScreenBoot {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    return {};
  }
  const out: ScreenBoot = {},
    screen = q.get('screen'),
    region = q.get('region');
  const named = screenOfName(screen);
  if (named) out.screen = named;
  if (region === ALL) out.region = NAT;
  else if (isRegion(region, govs)) out.region = region;
  const wil = q.get('wil');
  if (
    out.screen &&
    WIL_SCREENS.includes(out.screen) &&
    wil &&
    /^[1-9]\d{0,3}$/.test(wil) &&
    wils.includes(+wil)
  )
    out.wil = +wil;
  return out;
}

export function screenSearch(search: string, screen: Screen, region: string | null): string {
  const q = new URLSearchParams(search),
    name = URL_NAMES[screen];
  q.delete('screen');
  q.delete('region');
  if (name) {
    if (screen !== 'draw') q.delete('wil');
    q.set('screen', name);
    if (screen !== 'draw') q.set('region', region && region !== NAT ? region : ALL);
  }
  const out = q.toString();
  return out ? '?' + out : '';
}

export const wilIds = (wilPt: Record<string, readonly { i: number }[]>): number[] =>
  Object.values(wilPt).flatMap((l) => l.map((p) => p.i));
export function govOfWil(
  id: number,
  wilPt: Record<string, readonly { i: number }[]>,
): string | null {
  for (const [g, l] of Object.entries(wilPt)) if (l.some((p) => p.i === id)) return g;
  return null;
}

export function loadScreenPrefs(govs: readonly string[]): ScreenPrefs {
  try {
    return parseScreenPrefs(localStorage.getItem(SCREEN_KEY), govs);
  } catch {
    return { ...SCREEN_DEFAULTS };
  }
}
export function saveScreenPrefs(p: ScreenPrefs): void {
  try {
    localStorage.setItem(SCREEN_KEY, JSON.stringify(p));
  } catch {
  }
}

export const RELOAD_KEY = 'majlis.reload';
export const RELOAD_FRESH = 60 * 1000;
export const RELOAD_GUARD = 60 * 1000;
export interface ReloadMark {
  screen?: Screen;
  at: number;
}
export function parseReload(raw: string | null, now: number): ReloadMark | null {
  let p: unknown;
  try {
    p = JSON.parse(raw || 'null');
  } catch {
    return null;
  }
  if (!p || typeof p !== 'object') return null;
  const o = p as Record<string, unknown>,
    at = Object.hasOwn(o, 'at') ? o['at'] : undefined,
    screen = Object.hasOwn(o, 'screen') ? o['screen'] : undefined;
  if (typeof at !== 'number' || !Number.isFinite(at) || Math.abs(now - at) > RELOAD_FRESH)
    return null;
  return typeof screen === 'string' && BOOT_SCREENS.includes(screen)
    ? { screen: screen as Screen, at }
    : { at };
}
export function readReload(now: number): ReloadMark | null {
  try {
    return parseReload(sessionStorage.getItem(RELOAD_KEY), now);
  } catch {
    return null;
  }
}
export function writeReload(m: ReloadMark): boolean {
  try {
    sessionStorage.setItem(RELOAD_KEY, JSON.stringify(m));
    return true;
  } catch {
    return false;
  }
}
