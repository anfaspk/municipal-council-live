import { countRace, CWil } from '../count/count';
import { num, Ref } from '../stats/stats';

export interface ConflictCandRow {
  c: Ref & { imu?: string; ims?: string; imm?: string; iml?: string };
  v: number;
  vP?: string;
  notificationAcceptStatus?: string;
  selectionStatus?: string;
  selectedPosition?: number;
  conflictNotificationList?: {
    id: number;
    conflictedWilayatNotificationId: number;
    acceptStatus?: string;
  }[];
  notificationSentCount?: number;
}
export interface ConflictRoundRow {
  id: number;
  acceptStatus?: string;
  sentTime?: string;
  expiryTime?: string;
}
export interface ConflictInfoResp {
  w: Ref & { r?: Ref };
  cFS: string;
  cFT: string;
  cFRS: string;
  configuration?: { frequency?: number; period?: number };
  conflictCandidateList: ConflictCandRow[];
  notificationList?: ConflictRoundRow[];
  selectedCandidateList: { p: number; c: Ref }[];
}

export interface CDrawWin {
  id: string;
  seat: number;
}
export interface CDraw {
  wid: number;
  tied: string[];
  wins: CDrawWin[];
  votes: number | null;
}

const norm = (s?: string | null): string => (s || '').toLowerCase().replace(/[\s_-]/g, '');
const seatOf = (x: unknown): number | null => {
  const n = num(x);
  return n !== null && n >= 1 && Number.isInteger(n) ? n : null;
};

export function drawOf(wid: number, r: ConflictInfoResp | null | undefined): CDraw | null {
  if (!r || norm(r.cFRS) !== 'resolved') return null;
  const list = Array.isArray(r.conflictCandidateList) ? r.conflictCandidateList : [],
    tied = list.filter((x) => x?.c).map((x) => String(x.c.i));
  const wins = (Array.isArray(r.selectedCandidateList) ? r.selectedCandidateList : [])
    .filter((x) => x?.c)
    .map((x) => ({ id: String(x.c.i), seat: seatOf(x.p) }))
    .filter((x): x is CDrawWin => x.seat !== null)
    .sort((a, b) => a.seat - b.seat);
  if (tied.length < 2 || !wins.length || wins.some((x) => !tied.includes(x.id))) return null;
  return { wid, tied, wins, votes: num(list[0]?.v) };
}

export function drawFromCount(w: CWil): CDraw | null {
  if (!w.drawn) return null;
  const r = countRace(w),
    last = r.top[r.top.length - 1];
  if (!last) return null;
  const tied = r.sorted.filter((c) => c.v === last.v);
  if (tied.length < 2) return null;
  const wins = r.top
    .map((c, k) => ({ id: c.id, seat: k + 1, v: c.v }))
    .filter((x) => x.v === last.v)
    .map(({ id, seat }) => ({ id, seat }));
  return { wid: w.id, tied: tied.map((c) => c.id), wins, votes: last.v };
}

export type TieStage = 'prep' | 'ready' | 'notified' | 'resolving' | 'resolved';
const STAGES: Record<string, TieStage> = {
  conflictready: 'ready',
  notificationaccepted: 'notified',
  resolveready: 'resolving',
  resolved: 'resolved',
};
export const tieStage = (cFRS?: string | null): TieStage => {
  const s = norm(cFRS);
  return !s || s === 'na' ? 'prep' : (STAGES[s] ?? 'ready');
};
export const TIE_STAGES: readonly TieStage[] = ['ready', 'notified', 'resolving', 'resolved'];

export type TieAck = 'pending' | 'accepted' | 'expired';
const ACKS: Record<string, TieAck> = {
  pending: 'pending',
  accepted: 'accepted',
  expired: 'expired',
};
export const tieAck = (s?: string | null): TieAck | null => ACKS[norm(s)] ?? null;

export interface CTie {
  wid: number;
  stage: TieStage;
  acks: ReadonlyMap<string, TieAck>;
  rounds: number;
  maxRounds: number | null;
  roundOpen: boolean;
  draw: CDraw | null;
}

const sameAcks = (a: ReadonlyMap<string, TieAck>, b: ReadonlyMap<string, TieAck>): boolean =>
  a.size === b.size && [...a].every(([k, v]) => b.get(k) === v);
const sameTie = (a: CTie, b: CTie): boolean =>
  a.stage === b.stage &&
  a.rounds === b.rounds &&
  a.maxRounds === b.maxRounds &&
  a.roundOpen === b.roundOpen &&
  sameAcks(a.acks, b.acks) &&
  (a.draw && b.draw ? drawKey(a.draw) === drawKey(b.draw) : a.draw === b.draw);

export function tieInfoOf(wid: number, r: ConflictInfoResp, prev?: CTie | null): CTie {
  const acks = new Map<string, TieAck>();
  for (const x of Array.isArray(r.conflictCandidateList) ? r.conflictCandidateList : []) {
    const a = x?.c ? tieAck(x.notificationAcceptStatus) : null;
    if (a) acks.set(String(x.c.i), a);
  }
  const list = Array.isArray(r.notificationList) ? r.notificationList.filter((x) => !!x) : [],
    max = num(r.configuration?.frequency);
  const next: CTie = {
    wid,
    stage: tieStage(r.cFRS),
    acks,
    rounds: list.length,
    maxRounds: max !== null && Number.isInteger(max) && max >= 1 ? max : null,
    roundOpen: list.some((x) => tieAck(x.acceptStatus) === 'pending'),
    draw: drawOf(wid, r),
  };
  return prev && sameTie(prev, next) ? prev : next;
}

export const tieReopened = (w: Pick<CWil, 'drawn' | 'conflict'>): boolean =>
  !w.drawn && (!w.conflict || ['prep', 'ready'].includes(tieStage(w.conflict.res)));

export const drawKey = (d: CDraw): string =>
  d.wid + ':' + d.wins.map((x) => x.id + '@' + x.seat).join(',');

export interface TossStep {
  i: number;
  ms: number;
}
const FAST = 70,
  SLOW = 560,
  MIN_STEPS = 14;
export function tossSteps(
  n: number,
  land: number,
  laps = Math.max(2, Math.ceil(MIN_STEPS / n)),
): TossStep[] {
  if (n < 1 || land < 0 || land >= n) return [];
  const total = laps * n + land + 1,
    out: TossStep[] = [];
  for (let k = 0; k < total; k++) {
    const x = total > 1 ? k / (total - 1) : 1;
    out.push({ i: k % n, ms: Math.round(FAST + (SLOW - FAST) * x * x * x) });
  }
  return out;
}

export function tieKind(type: string, seats: number): 'f1' | 'f2' | 's' {
  if (norm(type) === 's') return 's';
  return seats >= 2 ? 'f2' : 'f1';
}
