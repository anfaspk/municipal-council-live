import {
  CDraw,
  CDrawWin,
  CTie,
  drawFromCount,
  TieAck,
  tieKind,
  TieStage,
  tieStage,
  TIE_STAGES,
  tossSteps,
} from '../../../domain/conflict/conflict';
import { CCand, CGov, countRace, CWil } from '../../../domain/count/count';
import { KeyInfo, screenKey } from '../../../shared/motion/screen-keys';
import { raceCand, ResCand } from '../../../shared/ui/race-board.model';

export interface TieHeld {
  cand: ResCand;
  seat: number;
}
export interface TieItem {
  id: number;
  gid: string;
  gov: string;
  name: string;
  n: string;
  seats: number;
  state: 'open' | 'drawn';
  kind: 'f1' | 'f2' | 's' | null;
  tied: ResCand[];
  held: TieHeld[];
  votes: number | null;
  draw: CDraw | null;
  source: 'api' | 'count' | null;
  stage: TieStage;
  acks: ReadonlyMap<string, TieAck>;
  rounds: { n: number; max: number | null; open: boolean } | null;
}
const NO_ACKS: ReadonlyMap<string, TieAck> = new Map();
const NO_TIES: ReadonlyMap<number, CTie> = new Map();

export function tieOf(
  g: CGov,
  w: CWil,
  draws: ReadonlyMap<number, CDraw>,
  ties: ReadonlyMap<number, CTie> = NO_TIES,
): TieItem | null {
  if (w.st === 'await' || (!w.conflict && !w.drawn)) return null;
  const r = countRace(w),
    top = Math.max(1, ...w.cands.map((c) => c.v)),
    rc = (c: CCand) => raceCand(c, top),
    base = { id: w.id, gid: g.id, gov: g.ar, name: w.ar, n: w.n, seats: w.seats };
  const own = tieStage(w.conflict?.res),
    early = !w.drawn && draws.has(w.id) && (own === 'notified' || own === 'resolving');
  if (!w.drawn && !early) {
    const info = ties.get(w.id);
    return {
      ...base,
      state: 'open',
      stage: info && info.stage !== 'resolved' && own !== 'prep' ? info.stage : own,
      acks: info?.acks ?? NO_ACKS,
      rounds: info ? { n: info.rounds, max: info.maxRounds, open: info.roundOpen } : null,
      kind: w.conflict?.text ? tieKind(w.conflict.text, w.seats) : null,
      tied: r.tied.length >= 2 ? r.tied.map(rc) : [],
      held: r.top.map((c, k) => ({ cand: rc(c), seat: k + 1 })),
      votes: r.tied[0]?.v ?? null,
      draw: null,
      source: null,
    };
  }
  const api = draws.get(w.id),
    d = api ?? drawFromCount(w),
    ids = d?.tied ?? [],
    tied = ids.flatMap((id) => w.cands.filter((c) => c.id === id)).map(rc),
    shown = tied.map((c) => c.id),
    ok = !!d && tied.length >= 2 && d.wins.length > 0 && d.wins.every((x) => shown.includes(x.id));
  return {
    ...base,
    state: 'drawn',
    kind: null,
    tied: tied.length >= 2 ? tied : [],
    held: r.top
      .map((c, k) => ({ c, seat: k + 1 }))
      .filter((x) => !ids.includes(x.c.id))
      .map((x) => ({ cand: rc(x.c), seat: x.seat })),
    votes: d?.votes ?? null,
    draw: ok ? d : null,
    source: ok ? (api ? 'api' : 'count') : null,
    stage: 'resolved',
    acks: NO_ACKS,
    rounds: null,
  };
}

export function tiesOf(
  govs: readonly CGov[],
  draws: ReadonlyMap<number, CDraw>,
  ties: ReadonlyMap<number, CTie> = NO_TIES,
): TieItem[] {
  return govs.flatMap((g) =>
    g.wil.map((w) => tieOf(g, w, draws, ties)).filter((x): x is TieItem => x !== null),
  );
}

export const STAGE_TEXT = {
  prep: 'cxdStPrep',
  ready: 'cxdStReady',
  notified: 'cxdStNotified',
  resolving: 'cxdStResolving',
  resolved: 'cxDrawn',
} as const satisfies Record<TieStage, string>;
export const STAGE_ROW = {
  prep: 'cxdRowPrep',
  ready: 'cxdRowReady',
  notified: 'cxdRowNotified',
  resolving: 'cxdRowResolving',
  resolved: 'cxdDrawnS',
} as const satisfies Record<TieStage, string>;
export const stageStep = (s: TieStage): number => TIE_STAGES.indexOf(s);

export function ackCount(it: TieItem): { a: number; n: number } | null {
  if (!it.acks.size || !it.tied.length) return null;
  return { a: it.tied.filter((c) => it.acks.get(c.id) === 'accepted').length, n: it.tied.length };
}

export type TossEvent =
  | { at: number; type: 'seat'; seat: number }
  | { at: number; type: 'lit'; i: number }
  | { at: number; type: 'won'; id: string; seat: number }
  | { at: number; type: 'end' };
export const TOSS_LEAD = 900;
export const TOSS_GAP = 2200;

export function tossPlan(
  ids: readonly string[],
  wins: readonly CDrawWin[],
  lead = TOSS_LEAD,
  gap = TOSS_GAP,
): TossEvent[] {
  const out: TossEvent[] = [],
    done = new Set<string>();
  let t = lead;
  for (const win of wins) {
    const inPlay = ids.map((_, i) => i).filter((i) => !done.has(ids[i]!)),
      land = inPlay.indexOf(ids.indexOf(win.id));
    if (land < 0) continue;
    out.push({ at: t, type: 'seat', seat: win.seat });
    if (inPlay.length > 1)
      for (const s of tossSteps(inPlay.length, land)) {
        out.push({ at: t, type: 'lit', i: inPlay[s.i]! });
        t += s.ms;
      }
    out.push({ at: t, type: 'won', id: win.id, seat: win.seat });
    done.add(win.id);
    t += gap;
  }
  out.push({ at: done.size ? t - gap / 2 : lead, type: 'end' });
  return out;
}

export type DrawKey =
  | { type: 'tab' }
  | { type: 'back' }
  | { type: 'play' }
  | { type: 'move'; step: 1 | -1 }
  | { type: 'jump'; to: 'first' | 'last' };

export function drawKey(e: KeyInfo): DrawKey | null {
  const a = screenKey(e, 'tv');
  if (!a) return null;
  if (a.type === 'tab') return a;
  if (a.type === 'close') return { type: 'back' };
  if (a.type === 'play') return a.pause ? null : { type: 'play' };
  if (a.type === 'wil') return { type: 'move', step: a.step };
  if (a.type === 'go')
    return a.to === 'next' || a.to === 'prev'
      ? { type: 'move', step: a.to === 'next' ? 1 : -1 }
      : { type: 'jump', to: a.to };
  return null;
}

export const stepTie = (i: number, n: number, step: number): number =>
  n ? (((i + step) % n) + n) % n : 0;

export function drawBootWil(search: string): number | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    return null;
  }
  const v = q.get('wil');
  if (q.get('screen') !== 'draw' || v === null || !/^\d{1,4}$/.test(v)) return null;
  const n = +v;
  return n >= 1 ? n : null;
}
