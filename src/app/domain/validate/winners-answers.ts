import { WinnerResp } from '../winners/winners';
import { cands, Checked, Notes, uniq } from './answers';
import { wholeId } from './figure';
import { cleanText } from './text';

export function checkWinners(id: number, r: WinnerResp): Checked<WinnerResp> {
  const notes = new Notes('result/winner/' + id);
  notes.figures(r);
  if (r?.r && wholeId(r.r.i) !== id)
    notes.add('region:' + String(r.r.i), 'answers governorate ' + JSON.stringify(r.r.i));
  const rows = uniq(notes, r?.wL, 'w', 'wilayat');
  if (!Array.isArray(rows)) {
    notes.add('wL', 'no wilayat list');
    return { value: { ...r, wL: [] }, issues: notes.issues };
  }
  return {
    value: {
      ...r,
      r: r.r ? { ...r.r, n: cleanText(r.r.n) } : r.r,
      wL: rows.map((row) => ({
        ...row,
        wCL: cands(notes, row.wCL, 'wilayat ' + row.w.i + ' winner'),
      })),
    },
    issues: notes.issues,
  };
}
