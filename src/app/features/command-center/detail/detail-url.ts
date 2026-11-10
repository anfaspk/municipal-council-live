export interface DetailAt {
  gov: string;
  wil?: number;
  vil?: number;
}
export type DetailLevel = 'gov' | 'wil' | 'vil';
export const DETAIL_KEYS = ['gov', 'wil', 'vil'] as const;

const params = (search: string): URLSearchParams | null => {
  try {
    return new URLSearchParams(search);
  } catch {
    return null;
  }
};
const idOf = (v: string | null): number | null =>
  v !== null && /^[1-9]\d{0,14}$/.test(v) ? Number(v) : null;

export function readDetail(search: string, govs: readonly string[]): DetailAt | null {
  const q = params(search);
  if (!q || q.has('screen')) return null;
  const gov = q.get('gov');
  if (gov === null || !govs.includes(gov)) return null;
  const wil = idOf(q.get('wil'));
  if (wil === null) return { gov };
  const vil = idOf(q.get('vil'));
  return vil === null ? { gov, wil } : { gov, wil, vil };
}

export function writeDetail(at: DetailAt | null, search: string): string {
  const q = params(search) ?? new URLSearchParams();
  q.delete('screen');
  DETAIL_KEYS.forEach((k) => q.delete(k));
  if (at) {
    q.set('gov', at.gov);
    if (at.wil !== undefined) q.set('wil', String(at.wil));
    if (at.wil !== undefined && at.vil !== undefined) q.set('vil', String(at.vil));
  }
  const s = q.toString();
  return s ? '?' + s : '';
}

export const levelOf = (at: DetailAt): DetailLevel =>
  at.vil !== undefined ? 'vil' : at.wil !== undefined ? 'wil' : 'gov';

export function upOf(at: DetailAt): DetailAt | null {
  if (at.vil !== undefined && at.wil !== undefined) return { gov: at.gov, wil: at.wil };
  if (at.wil !== undefined) return { gov: at.gov };
  return null;
}

export const sameAt = (a: DetailAt | null, b: DetailAt | null): boolean =>
  a === b || (!!a && !!b && a.gov === b.gov && a.wil === b.wil && a.vil === b.vil);

export function settle(
  at: DetailAt,
  wils: readonly number[] | undefined,
  vils: readonly number[] | undefined,
): DetailAt {
  if (at.wil === undefined) return at;
  if (wils && !wils.includes(at.wil)) return { gov: at.gov };
  if (at.vil === undefined) return at;
  if (vils && !vils.includes(at.vil)) return { gov: at.gov, wil: at.wil };
  return at;
}
