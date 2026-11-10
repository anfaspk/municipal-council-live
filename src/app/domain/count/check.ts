import { Issue } from '../stats/check';
import { num } from '../stats/stats';
import { CGov, CWilRow, unconfirmed } from './count';

export function checkCountRows(rows: Iterable<CWilRow>): Issue[] {
  const out: Issue[] = [];
  for (const r of rows) {
    if (!r || !r.w) continue;
    const at = 'counting wilayat ' + r.w.i;
    unconfirmed(r).forEach(([k, v]) =>
      out.push({
        key: 'status:' + k + ':' + v,
        text:
          'counting: unconfirmed ' +
          k +
          ' value "' +
          v +
          '" (not interpreted; status taken from the figures)',
      }),
    );
    if (num(r.v?.t) === null || num(r.c?.t) === null)
      out.push({
        key: at + ':figures',
        text: at + ': ballots cast (v.t) or counted (c.t) missing or not a number',
      });
    [...(r.lCL || []), ...(r.wCL || [])].forEach((c) => {
      if (!c || !c.c) return;
      if (num(c.v) === null)
        out.push({
          key: at + ':cand:' + c.c.i,
          text: at + ': candidate ' + c.c.i + ' votes missing or not a number',
        });
      const p = c.vP == null ? null : Number(c.vP);
      if (p !== null && !(p >= 0 && p <= 100))
        out.push({
          key: at + ':vP:' + c.c.i,
          text: at + ': candidate ' + c.c.i + ' share (vP) "' + c.vP + '" is not a percent',
        });
    });
  }
  return out;
}

export function checkCount(govs: readonly CGov[]): Issue[] {
  const out: Issue[] = [];
  govs.forEach((g) =>
    g.wil.forEach((w) => {
      const at = 'counting wilayat ' + w.id;
      if (w.counted > w.cast)
        out.push({
          key: at + ':over',
          text: at + ': ' + w.counted + ' ballots counted but ' + w.cast + ' cast',
        });
      if (w.cast && w.m + w.f !== w.cast)
        out.push({
          key: at + ':split',
          text: at + ': ballots cast by men ' + w.m + ' + women ' + w.f + ' ≠ cast ' + w.cast,
        });
      if (w.cands.length && !w.seats)
        out.push({ key: at + ':seats', text: at + ': no seat count (m): no seat line is shown' });
    }),
  );
  return out;
}
