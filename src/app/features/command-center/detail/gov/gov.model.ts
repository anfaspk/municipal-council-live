import { Hour } from '../../../../domain/stats/stats';
import { National, turnout } from '../../../../domain/stats/turnout';
import { BandStrip, bandStripModel, StripPlace } from '../charts/band-strip.model';
import { hourLabel } from '../parts/rhythm.model';
export const natTurnout = (national: National): number | null =>
  !national.unread.includes('registered') && national.registered > 0 ? national.turnout : null;
export interface GlanceRow {
  id: number;
  name: string;
  reg: number;
  voted: number;
}
export interface Glance {
  strip: BandStrip<number>;
  top: StripPlace<number> | null;
  low: StripPlace<number> | null;
  peak: { h: string; v: number } | null;
}
export function glanceModel(rows: readonly GlanceRow[], hours: readonly Hour[]): Glance {
  const places = rows
      .filter((r) => r.reg > 0)
      .map((r): StripPlace<number> => ({ id: r.id, name: r.name, t: turnout(r) })),
    strip = bandStripModel(places, 1),
    top = strip.best[0] ?? null,
    low = strip.worst[0] ?? null;
  let peak: Hour | null = null;
  for (const h of hours) if (h.v > 0 && (!peak || h.v > peak.v)) peak = h;
  return {
    strip,
    top,
    low,
    peak: peak ? { h: hourLabel(peak.h), v: peak.v } : null,
  };
}
