import { bigPhoto } from '../winners/winners';
import { candInitials } from '../count/count';
import { num } from '../stats/stats';
import { cleanText } from '../validate/text';
import { ConflictInfoResp, ConflictRoundRow, TieAck, tieAck, TieStage, tieStage } from './conflict';

export interface AcceptLink {
  wid: number;
  cid: number;
  ccid: number;
  nid: number;
  sec: string;
}
export function parseAcceptLink(search: string): AcceptLink | null {
  const q = new URLSearchParams(search);
  const int = (k: string): number => {
    const v = q.get(k)?.trim() ?? '';
    return /^\d{1,9}$/.test(v) ? Number(v) : NaN;
  };
  const link = {
    wid: int('id'),
    cid: int('caid'),
    ccid: int('ccid'),
    nid: int('nid'),
    sec: q.get('sec')?.trim() ?? '',
  };
  const ok =
    [link.wid, link.cid, link.ccid, link.nid].every((n) => Number.isInteger(n) && n > 0) &&
    link.wid <= 63 &&
    /^[0-9A-Fa-f]{1,20}$/.test(link.sec);
  return ok ? link : null;
}

export type AcceptOutcome =
  'accepted' | 'alreadyAccepted' | 'linkExpired' | 'finallyExpired' | 'linkInvalid' | 'serverError';
export function acceptOutcome(
  body: { s?: unknown; m?: unknown } | null | undefined,
): AcceptOutcome {
  if (body?.s === 1) return 'accepted';
  const m = typeof body?.m === 'string' ? body.m.trim() : '';
  if (/Already Accepted$/.test(m)) return 'alreadyAccepted';
  if (/^All Notifications For Candidate .* Expired$/.test(m)) return 'finallyExpired';
  if (/Expired$/.test(m)) return 'linkExpired';
  if (/Does Not Exist$/.test(m) || /Mismatch|Not In Wilayat/.test(m)) return 'linkInvalid';
  return 'serverError';
}

const MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
export function roundTime(s: string | null | undefined): number | null {
  const m = /^(\d{4})-([A-Za-z]{3})-(\d{1,2}) (\d{1,2}):(\d{2}):(\d{2}) ?(AM|PM)$/i.exec(
    s?.trim() ?? '',
  );
  if (!m) return null;
  const [, y = '', mon = '', d = '', h = '', mi = '', se = '', ap = ''] = m,
    month = MON.indexOf(mon.toLowerCase()),
    hour = Number(h);
  if (month < 0 || hour < 1 || hour > 12) return null;
  const h24 = (hour % 12) + (ap.toUpperCase() === 'PM' ? 12 : 0);
  return Date.UTC(Number(y), month, Number(d), h24, Number(mi), Number(se)) - 4 * 3600 * 1000;
}

const LAG = 60 * 1000;
export interface RoundClock {
  endsAt: number;
  total: number;
}
export function roundClock(r: ConflictRoundRow | null | undefined, now: number): RoundClock | null {
  const a = roundTime(r?.sentTime),
    b = roundTime(r?.expiryTime);
  if (a === null || b === null || b <= a) return null;
  const left = b - now;
  if (left > b - a + LAG) return null;
  if (left < -LAG && tieAck(r?.acceptStatus) === 'pending') return null;
  return { endsAt: b, total: b - a };
}

export type AcceptState =
  | 'loading'
  | 'unknown'
  | 'invalid'
  | 'gone'
  | 'nodraw'
  | 'open'
  | 'accepted'
  | 'expired'
  | 'final'
  | 'drawn';
export type AcceptRead = { info: ConflictInfoResp } | { fail: 'nodraw' | 'error' };

export interface AcceptPerson {
  id: string;
  name: string;
  photo: string | null;
  initials: string;
  ack: TieAck | null;
  me: boolean;
  won: boolean | null;
  seat: number | null;
}
export interface AcceptView {
  state: AcceptState;
  wilayat: string | null;
  region: string | null;
  kind: 'f' | 's' | null;
  votes: number | null;
  stage: TieStage | null;
  me: AcceptPerson | null;
  others: AcceptPerson[];
  round: { n: number; max: number | null; clock: RoundClock | null } | null;
  more: number | null;
  acks: { done: number; all: number };
}

const EMPTY: Omit<AcceptView, 'state'> = {
  wilayat: null,
  region: null,
  kind: null,
  votes: null,
  stage: null,
  me: null,
  others: [],
  round: null,
  more: null,
  acks: { done: 0, all: 0 },
};
const by = (state: AcceptState): AcceptView => ({ ...EMPTY, state });
const OUTCOME: Partial<Record<AcceptOutcome, AcceptState>> = {
  accepted: 'accepted',
  alreadyAccepted: 'accepted',
  linkExpired: 'expired',
  finallyExpired: 'final',
  linkInvalid: 'invalid',
};
const norm = (s?: string | null): string => (s || '').toLowerCase();

function person(
  x: ConflictInfoResp['conflictCandidateList'][number],
  me: boolean,
  drawn: boolean,
  winners: ReadonlySet<string>,
): AcceptPerson {
  const name = cleanText(String(x.c.n ?? '')),
    sel = norm(x.selectionStatus),
    seat = num(x.selectedPosition);
  return {
    id: String(x.c.i),
    name,
    photo: bigPhoto(x.c),
    initials: candInitials(name),
    ack: tieAck(x.notificationAcceptStatus),
    me,
    won: !drawn
      ? null
      : sel === 'selected' || (sel !== 'notselected' && winners.has(String(x.c.i))),
    seat: drawn && seat !== null && seat >= 1 ? seat : null,
  };
}

export function acceptView(
  link: AcceptLink | null,
  read: AcceptRead | null,
  now: number,
  outcome: AcceptOutcome | null,
): AcceptView {
  if (!link || outcome === 'linkInvalid') return by('invalid');
  const decided = outcome ? OUTCOME[outcome] : undefined;
  if (!read) return by(decided ?? 'loading');
  if ('fail' in read) return by(read.fail === 'nodraw' ? 'nodraw' : (decided ?? 'unknown'));
  const r = read.info,
    list = r.conflictCandidateList,
    mine = list.find((x) => String(x.c.i) === String(link.cid));
  if (!mine) return by('invalid');
  const stage = tieStage(r.cFRS),
    drawn = stage === 'resolved',
    winners = new Set(r.selectedCandidateList.map((x) => String(x.c.i))),
    me = person(mine, true, drawn, winners),
    others = list.filter((x) => x !== mine).map((x) => person(x, false, drawn, winners));
  const freq = num(r.configuration?.frequency),
    max = freq !== null && Number.isInteger(freq) && freq >= 1 ? freq : null,
    sent = num(mine.notificationSentCount);
  const notes = Array.isArray(mine.conflictNotificationList) ? mine.conflictNotificationList : [],
    note = notes.find((x) => x?.id === link.nid),
    rounds = r.notificationList ?? [],
    at = note ? rounds.findIndex((x) => x?.id === note.conflictedWilayatNotificationId) : -1,
    row = at >= 0 ? rounds[at] : undefined,
    clock = roundClock(row, now);
  const base: Omit<AcceptView, 'state'> = {
    wilayat: cleanText(String(r.w?.n ?? '')) || null,
    region: cleanText(String(r.w?.r?.n ?? '')) || null,
    kind: norm(r.cFT) === 's' ? 's' : norm(r.cFT) === 'f' ? 'f' : null,
    votes: num(mine.v),
    stage,
    me,
    others,
    round: row ? { n: rounds.length - at, max, clock } : null,
    more: me.ack === 'pending' && max !== null && sent !== null ? Math.max(0, max - sent) : null,
    acks: { done: [me, ...others].filter((p) => p.ack === 'accepted').length, all: list.length },
  };
  const state = ((): AcceptState => {
    if (drawn) return 'drawn';
    if (decided) return decided;
    if (me.ack === 'accepted') return 'accepted';
    if (me.ack === 'expired') return 'final';
    if (!note) return 'gone';
    if (tieAck(note.acceptStatus) === 'expired' || (clock && now >= clock.endsAt)) return 'expired';
    if (tieAck(note.acceptStatus) === 'accepted') return 'accepted';
    return 'open';
  })();
  return { ...base, state };
}

export const acceptSettled = (s: AcceptState): boolean =>
  s === 'invalid' || s === 'gone' || s === 'nodraw' || s === 'drawn';

export function leftClock(ms: number): string {
  const t = Math.max(0, Math.ceil(ms / 1000)),
    two = (n: number) => (n < 10 ? '0' : '') + n,
    h = Math.floor(t / 3600),
    m = Math.floor(t / 60) % 60,
    s = t % 60;
  return (h ? h + ':' + two(m) : two(m)) + ':' + two(s);
}
