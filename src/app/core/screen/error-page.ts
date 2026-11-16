export type DownWhy = 'api' | 'boot';
export interface Down {
  to: string;
  why: DownWhy;
  n: number;
  probe?: string;
}

export const DOWN_KEY = 'majlis.down';
export const DOWN_AFTER = 30 * 1000;
export const DOWN_AGAIN = 30 * 1000;

export function isAppPath(pathname: string, basePath: string): boolean {
  const b = basePath.endsWith('/') ? basePath : basePath + '/';
  if (pathname + '/' === b) return true;
  if (!pathname.startsWith(b)) return false;
  const rest = pathname.slice(b.length);
  return rest === '' || rest === 'index.html';
}

export function readDown(raw: string | null): Down | null {
  try {
    const d = JSON.parse(raw ?? 'null') as Partial<Down> | null;
    return d && typeof d.to === 'string' && Number.isInteger(d.n) && (d.n ?? -1) >= 0
      ? {
          to: d.to,
          why: d.why === 'boot' ? 'boot' : 'api',
          n: d.n as number,
          ...(typeof d.probe === 'string' ? { probe: d.probe } : {}),
        }
      : null;
  } catch {
    return null;
  }
}

export function nextDown(prev: Down | null, to: string, why: DownWhy, probe?: string): Down {
  return { to, why, n: prev ? prev.n + 1 : 0, ...(probe ? { probe } : {}) };
}

export function leaveFor(page: '404'): void;
export function leaveFor(page: '50x', why: DownWhy, probe?: string): void;
export function leaveFor(page: '404' | '50x', why: DownWhy = 'api', probe?: string): void {
  if (page === '50x') {
    try {
      const prev = readDown(sessionStorage.getItem(DOWN_KEY));
      const here = location.pathname + location.search + location.hash;
      sessionStorage.setItem(DOWN_KEY, JSON.stringify(nextDown(prev, here, why, probe)));
    } catch {
    }
  }
  location.replace(new URL(page + '.html', document.baseURI).href);
}

export function forgetDown(): void {
  try {
    sessionStorage.removeItem(DOWN_KEY);
  } catch {
  }
}

export function watchDown(probe: string): () => void {
  let t: ReturnType<typeof setTimeout> | undefined;
  const fire = () => {
    if (navigator.onLine) leaveFor('50x', 'api', probe);
    else addEventListener('online', back, { once: true });
  };
  const back = () => (t = setTimeout(fire, DOWN_AGAIN));
  t = setTimeout(fire, DOWN_AFTER);
  return () => {
    clearTimeout(t);
    removeEventListener('online', back);
  };
}
