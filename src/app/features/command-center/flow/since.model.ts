import type { CGov } from '../../../domain/count/count';
import { diffCount } from '../../../domain/count/diff';
import { diffStats } from '../../../domain/stats/diff';
import type { Gov } from '../../../domain/stats/stats';
import { ranked } from '../../../domain/stats/turnout';

export const SINCE_AFTER = 2 * 60_000;
export const SINCE_SHOW = 10_000;
export const SINCE_MAX = 3;

export interface SinceSnap {
  govs: readonly Gov[];
  turnout: number;
  count: readonly CGov[] | null;
}
export type SinceKind = 'milestone' | 'declare' | 'seat' | 'counted' | 'cross';
export interface SinceLine {
  kind: SinceKind;
  key: string;
  params: Record<string, string | number>;
}
export interface Since {
  lines: SinceLine[];
  moved: string[];
}

const ORDER: readonly SinceKind[] = ['milestone', 'declare', 'seat', 'counted', 'cross'];

export function sinceOf(prev: SinceSnap, next: SinceSnap): Since {
  const lines: SinceLine[] = [];
  const stats = diffStats(prev, next);
  const top = stats.filter((e) => e.type === 'milestone').reduce((m, e) => Math.max(m, e.p), 0);
  if (top) lines.push({ kind: 'milestone', key: 'flSinceMile', params: { p: top + '%' } });
  const crossed = new Map<string, { g: string; p: number }>();
  for (const e of stats)
    if (e.type === 'cross' && (crossed.get(e.gov.id)?.p ?? 0) < e.p)
      crossed.set(e.gov.id, { g: e.gov.ar, p: e.p });
  for (const c of crossed.values())
    lines.push({ kind: 'cross', key: 'flSinceCross', params: { g: c.g, p: c.p + '%' } });
  if (prev.count && next.count)
    for (const e of diffCount(prev.count, next.count)) {
      if (e.type === 'declare')
        lines.push({ kind: 'declare', key: 'flSinceDecl', params: { w: e.w.ar } });
      else if (e.type === 'lead' && e.inC)
        lines.push({ kind: 'seat', key: 'flSinceSeat', params: { w: e.w.ar, c: e.inC.ar } });
      else if (e.type === 'status' && e.to === 'pend')
        lines.push({ kind: 'counted', key: 'flSinceCounted', params: { w: e.w.ar } });
    }
  lines.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  return { lines: lines.slice(0, SINCE_MAX), moved: movedOf(prev.govs, next.govs) };
}

export function movedOf(prev: readonly Gov[], next: readonly Gov[]): string[] {
  const before = new Map(ranked(prev).map((g, i) => [g.id, i]));
  return ranked(next)
    .filter((g, i) => before.has(g.id) && before.get(g.id) !== i)
    .map((g) => g.id);
}
