import { Gov } from './stats';
import { turnout } from './turnout';

export interface StatsEvents {
  change: { id: string; gov: Gov; delta: number };
  cross: { gov: Gov; p: number };
  milestone: { p: number };
  pull: { total: number };
}
export type StatsEvent = {
  [K in keyof StatsEvents]: { type: K } & StatsEvents[K];
}[keyof StatsEvents];
export interface StatsSnapshot {
  govs: readonly Gov[];
  turnout: number;
}

const CROSS = [50, 60, 70, 75, 80, 85, 90],
  MILESTONES = [60, 65];
const signature = (g: Gov) => g.wils.map((w) => w.id + ':' + w.voted + ':' + w.reg).join(',');
const crossKey = (id: string, p: number) => 'cross:' + id + ':' + p,
  milestoneKey = (p: number) => 'milestone:' + p;

export function reached(s: StatsSnapshot): string[] {
  const out: string[] = [];
  s.govs.forEach((g) => {
    const t = turnout(g);
    CROSS.forEach((th) => {
      if (t >= th) out.push(crossKey(g.id, th));
    });
  });
  MILESTONES.forEach((m) => {
    if (s.turnout >= m) out.push(milestoneKey(m));
  });
  return out;
}
export const toldKey = (e: StatsEvent): string | null =>
  e.type === 'cross' ? crossKey(e.gov.id, e.p) : e.type === 'milestone' ? milestoneKey(e.p) : null;

export function diffStats(
  prev: StatsSnapshot,
  next: StatsSnapshot,
  told: ReadonlySet<string> = new Set(),
): StatsEvent[] {
  const out: StatsEvent[] = [],
    before = new Map<string, Gov>();
  prev.govs.forEach((g) => {
    if (!before.has(g.id)) before.set(g.id, g);
  });
  let total = 0;
  next.govs.forEach((g) => {
    const p = before.get(g.id);
    if (!p) return;
    const delta = g.voted - p.voted;
    if (!delta && g.reg === p.reg && signature(g) === signature(p)) return;
    total += delta;
    out.push({ type: 'change', id: g.id, gov: g, delta });
    const t0 = turnout(p),
      t1 = turnout(g);
    CROSS.forEach((th) => {
      if (t0 < th && t1 >= th && !told.has(crossKey(g.id, th)))
        out.push({ type: 'cross', gov: g, p: th });
    });
  });
  MILESTONES.forEach((m) => {
    if (prev.turnout < m && next.turnout >= m && !told.has(milestoneKey(m)))
      out.push({ type: 'milestone', p: m });
  });
  out.push({ type: 'pull', total });
  return out;
}
