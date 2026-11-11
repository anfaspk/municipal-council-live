import { t, TextPart, tParts } from '../../../core/i18n/i18n';
import { fmt, name, pct, pctNum, pts } from '../../../domain/format';
import { Gov } from '../../../domain/stats/stats';
import { Band, band, National, turnout } from '../../../domain/stats/turnout';
import { ringGeom } from '../../../shared/ui/marks';

export interface GenderRow {
  id: 'registered' | 'votesCast' | 'notVoted';
  label: string;
  m: number;
  f: number;
  total: number;
  pm: number;
  cls: string;
  totCls: string;
  aria: string;
}
export interface FocusView {
  key: string;
  name: string;
  alt: string;
  t: number;
  voted: number;
  band: Band;
  rank: number | null;
  micro: string;
  big: string;
  share: number;
  ring: ReturnType<typeof ringGeom>;
  vsNat: { up: boolean; text: string } | null;
  nat: number;
  gap: { text: string; who: string };
  rows: GenderRow[];
  turnoutBy: TextPart[];
}

function genderRow(
  id: GenderRow['id'],
  m: number,
  f: number,
  total: number,
  cls = '',
  totCls = '',
): GenderRow {
  const label = t(id);
  const pm = total ? (m / total) * 100 : 50;
  const aria =
    label +
    ': ' +
    t('male') +
    ' ' +
    fmt(m) +
    ' (' +
    pct(pm) +
    ')، ' +
    t('female') +
    ' ' +
    fmt(f) +
    ' (' +
    pct(100 - pm) +
    ')، ' +
    t('total') +
    ' ' +
    fmt(total);
  return { id, label, m, f, total, pm, cls, totCls, aria };
}

export function focusView(g: Gov | null, nat: National, rank: number | null): FocusView {
  const s = g
    ? {
        key: g.id,
        name: name(g),
        alt: '',
        t: turnout(g),
        voted: g.voted,
        reg: g.reg,
        regM: g.regM,
        votedM: g.votedM,
        share: nat.voted ? (g.voted / nat.voted) * 100 : 0,
        rank,
      }
    : {
        key: 'nat',
        name: t('national'),
        alt: t('allGovs'),
        t: nat.turnout,
        voted: nat.voted,
        reg: nat.registered,
        regM: nat.regM,
        votedM: nat.votedM,
        share: 100,
        rank: null,
      };
  const regF = s.reg - s.regM,
    vF = s.voted - s.votedM;
  const tM = s.regM ? (s.votedM / s.regM) * 100 : 0,
    tF = regF ? (vF / regF) * 100 : 0;
  const delta = s.t - nat.turnout,
    gap = s.voted ? ((s.votedM - vF) / s.voted) * 100 : 0;
  return {
    key: s.key,
    name: s.name,
    alt: s.alt,
    t: s.t,
    voted: s.voted,
    band: band(s.t),
    rank: s.rank,
    micro: t('focus') + (s.rank ? ' · ' + t('of11', { n: s.rank }) : ''),
    big: pctNum(s.t),
    share: s.share,
    ring: ringGeom(s.t, 54, 5),
    vsNat: g
      ? {
          up: delta >= 0,
          text: pts(delta) + ' ' + t('pts') + ' ' + t('vsNat'),
        }
      : null,
    nat: nat.turnout,
    gap: { text: pts(gap), who: gap >= 0 ? 'male' : 'female' },
    rows: [
      genderRow('registered', s.regM, regF, s.reg),
      genderRow('votesCast', s.votedM, vF, s.voted, '', 'v1'),
      genderRow('notVoted', s.regM - s.votedM, regF - vF, s.reg - s.voted, 'nv'),
    ],
    turnoutBy: tParts('turnoutBy', { m: pct(tM), f: pct(tF) }, ['m', 'f']),
  };
}
