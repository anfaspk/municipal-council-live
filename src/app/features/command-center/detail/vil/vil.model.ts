import { AGE_BANDS, villageAges, VillageAgeRow } from '../../../../domain/stats/age';
import { VillageDetail } from '../../../../domain/stats/place';
import { Village } from '../../../../domain/stats/stats';
import { turnout } from '../../../../domain/stats/turnout';

export function vilTurnout(d: VillageDetail | undefined, row: Village | undefined): number | null {
  if (d) return d.reg.t > 0 ? turnout({ reg: d.reg.t, voted: d.voted.t }) : null;
  return row ? row.t : null;
}

const NONE = { v: null, m: null, f: null };
export const NO_AGES: readonly VillageAgeRow[] = AGE_BANDS.map((band) => ({
  band,
  voted: { band, ...NONE },
  not: { band, ...NONE },
  t: null,
  tM: null,
  tF: null,
}));

export const vilAges = (d: VillageDetail): readonly VillageAgeRow[] =>
  d.ages ? villageAges(d.ages.voted, d.ages.not) : NO_AGES;
