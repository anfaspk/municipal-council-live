import { GEO } from '../../../domain/geo/geo.data';

export const FOLLOW_KEY = 'majlis.follow';

export interface Follow {
  gov: string;
  wil: number | null;
}

export function parseFollow(raw: string | null): Follow | null {
  if (!raw) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!v || typeof v !== 'object') return null;
  const { gov, wil } = v as Record<string, unknown>;
  if (typeof gov !== 'string' || !Object.hasOwn(GEO.g, gov)) return null;
  if (wil === null || wil === undefined) return { gov, wil: null };
  if (typeof wil !== 'number' || !Number.isInteger(wil)) return null;
  return GEO.wilPt[gov]?.some((p) => p.i === wil) ? { gov, wil } : null;
}

export const sameFollow = (a: Follow | null, b: Follow | null): boolean =>
  !!a && !!b && a.gov === b.gov && a.wil === b.wil;
