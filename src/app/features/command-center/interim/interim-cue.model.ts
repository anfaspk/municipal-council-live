import { InterimPhase } from '../../../domain/interim/interim';

export const CUE_LEAD = 60_000;
export const CUE_URGENT = 10_000;

export type Cue = 'off' | 'count' | 'open';
export function cueOf(phase: InterimPhase, left: number | null): Cue {
  if (phase === 'open') return 'open';
  return phase === 'soon' && left !== null && left <= CUE_LEAD ? 'count' : 'off';
}

export const CUE_FETCH = 30_000;
export function cueFetchIn(from: number | null, to: number | null, now: number): number | null {
  if (from === null || (to !== null && (to <= from || now >= to))) return null;
  return Math.max(0, from - CUE_LEAD - CUE_FETCH - now);
}

export const cueRing = (left: number | null): number =>
  left === null ? 0 : Math.min(1, Math.max(0, left / CUE_LEAD));
export const cueSecs = (left: number | null): number =>
  left === null ? 0 : Math.max(0, Math.ceil(left / 1000));
export const cueUrgent = (left: number | null): boolean => left !== null && left <= CUE_URGENT;
