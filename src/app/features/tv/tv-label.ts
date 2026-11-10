import { t } from '../../shared/ui/tv-strings';
import { fmt, pct } from '../../domain/format';
import { Gov } from '../../domain/stats/stats';
import { National, turnout } from '../../domain/stats/turnout';
import { NATIONAL } from './tv-slide.model';

export function slideLabel(o: {
  keys: readonly string[];
  k: number;
  gov: (id: string) => Gov | null | undefined;
  national: National;
  full: boolean;
}): string {
  const key = o.keys[o.k]!,
    g = key === NATIONAL ? null : o.gov(key);
  const s = t('tvGoTo', {
    n: o.k + 1,
    m: o.keys.length,
    name: g ? g.ar : t('natTurnout'),
  });
  if (!o.full) return s;
  const n = o.national,
    v = g ? g.voted : n.voted,
    r = g ? g.reg : n.registered,
    tt = g ? turnout(g) : n.turnout;
  return (
    s +
    '. ' +
    t('sTurnout') +
    ' ' +
    pct(tt) +
    '. ' +
    t('ofRegVoters', { v: fmt(v), r: fmt(r) }) +
    '.'
  );
}
