import { t } from '../../../core/i18n/i18n';
import { pctNum, pctOf } from '../../../domain/format';
import { National } from '../../../domain/stats/turnout';

export type Sex = 'm' | 'f';

export interface PulseSide {
  sex: Sex;
  label: string;
  voted: number;
  reg: number | null;
  voteShare: string;
  regShare: string;
  voteK: number;
  regK: number;
  k: number | null;
  turnout: string;
}

export interface PulseView {
  m: PulseSide;
  f: PulseSide;
  gap: string | null;
  parity: number | null;
}

function side(
  sex: Sex,
  voted: number,
  reg: number | null,
  votes: number,
  regs: number | null,
): PulseSide {
  return {
    sex,
    label: t(sex === 'm' ? 'male' : 'female'),
    voted,
    reg,
    voteShare: votes ? pctOf(voted, votes) : '—',
    regShare: reg !== null && regs ? pctOf(reg, regs) : '—',
    voteK: votes ? voted / votes : 0,
    regK: reg !== null && regs ? reg / regs : 0,
    k: reg ? Math.min(1, voted / reg) : null,
    turnout: reg ? pctOf(voted, reg) : '—',
  };
}

export function pulseView(n: National): PulseView {
  const regKnown = !n.unread.includes('regM') && !n.unread.includes('regF'),
    regM = regKnown ? n.regM : null,
    regF = regKnown ? n.regF : null,
    votes = n.votedM + n.votedF,
    regs = regKnown ? n.regM + n.regF : null;
  const m = side('m', n.votedM, regM, votes, regs),
    f = side('f', n.votedF, regF, votes, regs);
  const tm = regM ? (n.votedM / regM) * 100 : null,
    tf = regF ? (n.votedF / regF) * 100 : null,
    d = tm !== null && tf !== null ? tf - tm : null,
    p = d === null ? '' : pctNum(Math.abs(d));
  return {
    m,
    f,
    gap: d === null ? null : p === '0.00' ? t('gpEven') : t(d > 0 ? 'gpGapF' : 'gpGapM', { p }),
    parity: n.votedM ? Math.floor((n.votedF / n.votedM) * 100) : null,
  };
}
