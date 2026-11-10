import { AGE_BANDS, ageOf, ageTotal } from './age';
import { Counts, num, OverallResp, RegionResp, tally, VillageResp } from './stats';

export interface Issue {
  key: string;
  text: string;
}

const counts = (c: Partial<Counts> | null | undefined) => ({
  t: num(c?.t),
  m: num(c?.m),
  f: num(c?.f),
});

function checkCounts(out: Issue[], where: string, what: string, c: Partial<Counts> | undefined) {
  const x = counts(c);
  if (x.t === null || x.m === null || x.f === null)
    out.push({
      key: where + ':' + what + ':missing',
      text: where + ': ' + what + ' missing or not a number',
    });
  else if (x.m + x.f !== x.t)
    out.push({
      key: where + ':' + what + ':split',
      text: where + ': ' + what + ' men ' + x.m + ' + women ' + x.f + ' ≠ total ' + x.t,
    });
}

function checkHours(out: Issue[], where: string, list: Parameters<typeof tally>[0]): number | null {
  const t = tally(list);
  if (!t) {
    out.push({ key: where + ':hours:missing', text: where + ': hourly votes (hPSL) missing' });
    return null;
  }
  if (t.broken)
    out.push({
      key: where + ':hours:broken',
      text: where + ': ' + t.broken + ' hourly row(s) with unreadable votes',
    });
  if (t.unlabeled)
    out.push({
      key: where + ':hours:label',
      text:
        where +
        ': ' +
        t.unlabeled +
        ' hourly row(s) without an hour (pH): counted, not on the curve',
    });
  const split = (list || []).filter((x) => {
    const v = num(x?.v),
      m = num(x?.vM),
      f = num(x?.vF);
    return v !== null && m !== null && f !== null && m + f !== v;
  }).length;
  if (split)
    out.push({
      key: where + ':hours:split',
      text: where + ': ' + split + ' hourly row(s) where men + women ≠ votes',
    });
  checkAges(out, where + ' hours', list || []);
  return t.v;
}

export function checkAges(
  out: Issue[],
  where: string,
  rows: readonly (object | null | undefined)[],
): void {
  let missing = 0,
    off = 0;
  rows.forEach((x) => {
    const r = (x ?? {}) as Record<string, unknown>,
      sum = ageTotal(ageOf(r)),
      v = num(r['v']),
      m = num(r['vM']),
      f = num(r['vF']);
    if (!sum) missing++;
    else if (v !== null && m !== null && f !== null && (sum.v !== v || sum.m !== m || sum.f !== f))
      off++;
  });
  if (missing)
    out.push({
      key: where + ':age:missing',
      text:
        where +
        ': ' +
        missing +
        ' row(s) with age fields (v' +
        AGE_BANDS[0] +
        ' …) missing or not a number',
    });
  if (off)
    out.push({
      key: where + ':age:sum',
      text: where + ': ' + off + ' row(s) whose age bands do not add up to v, vM, vF',
    });
}

export function checkVillageAges(id: number, r: VillageResp): Issue[] {
  const out: Issue[] = [],
    at = 'statistics/village/' + id;
  checkAges(out, at + ' voted (pS)', [r.pS]);
  checkAges(out, at + ' not voted (nV)', [r.nV]);
  return out;
}

function checkTurnout(out: Issue[], where: string, voted: number | null, reg: number | null) {
  if (voted !== null && reg !== null && voted > reg)
    out.push({
      key: where + ':over',
      text: where + ': ' + voted + ' votes but ' + reg + ' registered voters',
    });
}

export function checkStats(o: OverallResp, regions: ReadonlyMap<number, RegionResp>): Issue[] {
  const out: Issue[] = [],
    nat = 'statistics/overall';
  if (num(o.p?.t) === null)
    out.push({
      key: nat + ':population',
      text: nat + ': population (p.t) missing or not a number',
    });
  checkCounts(out, nat, 'registered (r)', o.r);
  if (!Array.isArray(o.hPSRL)) {
    out.push({ key: nat + ':list', text: nat + ': governorate list (hPSRL) missing' });
    return out;
  }
  let regSum = 0,
    regAll = true;
  o.hPSRL
    .filter((g) => g && g.r)
    .forEach((g) => {
      const where = nat + ' governorate ' + g.r.i,
        reg = num(g.reg?.t);
      checkCounts(out, where, 'registered (reg)', g.reg);
      const voted = checkHours(out, where, g.hPSL);
      checkTurnout(out, where, voted, reg);
      if (reg === null) regAll = false;
      else regSum += reg;
      const rg = regions.get(g.r.i);
      if (rg) checkRegion(out, g.r.i, rg, reg, rg.lV && rg.lV === o.lV ? voted : null);
    });
  const natReg = num(o.r?.t);
  if (regAll && natReg !== null && regSum !== natReg)
    out.push({
      key: nat + ':regsum',
      text:
        nat +
        ': governorates add up to ' +
        regSum +
        ' registered voters, national figure ' +
        natReg,
    });
  return out;
}

function checkRegion(
  out: Issue[],
  id: number,
  r: RegionResp,
  govReg: number | null,
  govVoted: number | null,
) {
  const at = 'statistics/region/' + id;
  if (!Array.isArray(r.hPSWL)) {
    out.push({ key: at + ':list', text: at + ': wilayat list (hPSWL) missing' });
    return;
  }
  let reg = 0,
    voted = 0,
    whole = true;
  r.hPSWL
    .filter((w) => w && w.w)
    .forEach((w) => {
      const where = at + ' wilayat ' + w.w.i,
        wr = num(w.r?.t);
      checkCounts(out, where, 'registered (r)', w.r);
      const t = tally(w.hPSL),
        wv = checkHours(out, where, w.hPSL);
      checkTurnout(out, where, wv, wr);
      if (wr === null || wv === null || !t || t.broken) whole = false;
      reg += wr ?? 0;
      voted += wv ?? 0;
    });
  if (!whole) return;
  if (govReg !== null && reg !== govReg)
    out.push({
      key: at + ':regsum',
      text:
        at +
        ': wilayat add up to ' +
        reg +
        ' registered voters, governorate (statistics/overall) ' +
        govReg,
    });
  if (govVoted !== null && voted !== govVoted)
    out.push({
      key: at + ':votesum',
      text:
        at +
        ': wilayat add up to ' +
        voted +
        ' votes, governorate (statistics/overall) ' +
        govVoted,
    });
}
