import { API_BASE } from '../../core/api/api-base';

export const GATE_KEY = 'majlis.gate';
export const KEY_PARAM = 'key';
export const GATE_HASH = '70514e408f450dbfaf9c1b943c33076cc2cd20ee2eb8cb366bfd5661210fcf46';

const LOCAL = API_BASE.startsWith('http://localhost');

function stored(s: () => Storage): boolean {
  try {
    return s().getItem(GATE_KEY) === GATE_HASH;
  } catch {
    return false;
  }
}

export function remember(): boolean {
  for (const s of [() => localStorage, () => sessionStorage])
    try {
      s().setItem(GATE_KEY, GATE_HASH);
      if (stored(s)) return true;
    } catch {
    }
  return false;
}

const nameOf = (pair: string): string => {
  const n = pair.split('=')[0]!.replace(/\+/g, ' ');
  try {
    return decodeURIComponent(n);
  } catch {
    return n;
  }
};

export function withoutParam(search: string, name: string): string {
  const rest = search
    .replace(/^\?/, '')
    .split('&')
    .filter((p) => nameOf(p) !== name);
  return rest.some((p) => p !== '') ? '?' + rest.join('&') : '';
}

export async function openGate(): Promise<boolean> {
  if (LOCAL || stored(() => localStorage) || stored(() => sessionStorage)) return true;
  let key: string | null;
  try {
    key = new URLSearchParams(location.search).get(KEY_PARAM);
  } catch {
    return false;
  }
  if (key === null) return false;
  history.replaceState(
    history.state,
    '',
    location.pathname + withoutParam(location.search, KEY_PARAM) + location.hash,
  );
  const { keyMatches } = await import('./lock.model');
  if (!keyMatches(key)) return false;
  remember();
  return true;
}
