import { GEO } from '../geo/geo.data';
import { AGE_KEYS } from '../stats/age';
import { Issue } from '../stats/check';
import { OverallResp, Ref, RegionResp, VillageResp, WilayatResp } from '../stats/stats';
import {
  CCandRow,
  CountOverallResp,
  CountRegionResp,
  CountWilayatResp,
  CWilRow,
} from '../count/count';
import { InterimResp } from '../interim/interim';
import { isNumericText, wholeId } from './figure';
import { cleanText, hasBidi } from './text';

export interface Checked<T> {
  value: T;
  issues: Issue[];
}

export const onMap = (id: number): boolean =>
  Object.prototype.hasOwnProperty.call(GEO.g, String(id));

const FIGURES = new Set<string>(['t', 'm', 'f', 'v', 'vM', 'vF', 'vLC', 'p', ...AGE_KEYS]);
function textFigures(x: unknown): number {
  if (Array.isArray(x)) return x.reduce((n: number, y) => n + textFigures(y), 0);
  if (!x || typeof x !== 'object') return 0;
  return Object.entries(x).reduce(
    (n: number, [k, v]) => n + (FIGURES.has(k) && isNumericText(v) ? 1 : textFigures(v)),
    0,
  );
}

export class Notes {
  readonly issues: Issue[] = [];
  constructor(readonly at: string) {}
  add(key: string, text: string): void {
    this.issues.push({ key: this.at + ':' + key, text: this.at + ': ' + text });
  }
  figures(answer: unknown): void {
    const n = textFigures(answer);
    if (n) this.add('text', n + ' figure(s) sent as text (read as numbers)');
  }
}

export function uniq<K extends string, T extends Record<K, Ref>>(
  notes: Notes,
  list: T[] | null | undefined,
  key: K,
  what: string,
): T[] {
  if (!Array.isArray(list)) return list as unknown as T[];
  const seen = new Set<number>(),
    out: T[] = [];
  list.forEach((x) => {
    const r = x?.[key];
    if (!r) return;
    const id = wholeId(r.i);
    if (id === null)
      return notes.add(
        what + ':id:' + String(r.i),
        what + ' id ' + JSON.stringify(r.i) + ' is not a whole number (left out)',
      );
    if (seen.has(id))
      return notes.add(
        what + ':dup:' + id,
        what + ' ' + id + ' sent more than once (the first kept)',
      );
    seen.add(id);
    if (hasBidi(r.n))
      notes.add(
        what + ':bidi:' + id,
        what + ' ' + id + ': bidi control characters removed from the name',
      );
    out.push({ ...x, [key]: { ...r, i: id, n: cleanText(r.n) } });
  });
  return out;
}

export function checkOverall(
  o: OverallResp,
): Checked<OverallResp> & { others: OverallResp['hPSRL'] } {
  const notes = new Notes('statistics/overall');
  notes.figures(o);
  const all = uniq(notes, o.hPSRL, 'r', 'governorate');
  if (!Array.isArray(all)) return { value: o, others: [], issues: notes.issues };
  const others = all.filter((g) => !onMap(g.r.i));
  others.forEach((g) =>
    notes.add(
      'governorate:unknown:' + g.r.i,
      'governorate ' +
        g.r.i +
        ' is not on the map (not drawn; its votes count in the national figures)',
    ),
  );
  return { value: { ...o, hPSRL: all.filter((g) => onMap(g.r.i)) }, others, issues: notes.issues };
}

export function checkRegion(id: number, r: RegionResp): Checked<RegionResp> {
  const notes = new Notes('statistics/region/' + id);
  notes.figures(r);
  return { value: { ...r, hPSWL: uniq(notes, r.hPSWL, 'w', 'wilayat') }, issues: notes.issues };
}

export function checkWilayat(id: number, r: WilayatResp): Checked<WilayatResp> {
  const notes = new Notes('statistics/wilayat/' + id);
  notes.figures(r);
  return { value: { ...r, pSVLL: uniq(notes, r.pSVLL, 'vL', 'village') }, issues: notes.issues };
}

export function checkVillage(id: number, r: VillageResp): Checked<VillageResp> {
  const notes = new Notes('statistics/village/' + id);
  notes.figures(r);
  return { value: r, issues: notes.issues };
}

export function checkCountOverall(o: CountOverallResp): Checked<CountOverallResp> {
  const notes = new Notes('counting/overall');
  notes.figures(o);
  const all = uniq(notes, o.cIRL, 'r', 'governorate');
  if (!Array.isArray(all)) return { value: o, issues: notes.issues };
  all
    .filter((g) => !onMap(g.r.i))
    .forEach((g) =>
      notes.add(
        'governorate:unknown:' + g.r.i,
        'governorate ' + g.r.i + ' is not on the map (left out)',
      ),
    );
  return { value: { ...o, cIRL: all.filter((g) => onMap(g.r.i)) }, issues: notes.issues };
}

export function cands(notes: Notes, list: CCandRow[] | null | undefined, what: string): CCandRow[] {
  return uniq(notes, list as (CCandRow & { c: Ref })[] | undefined, 'c', what);
}
function wilRow(notes: Notes, row: CWilRow): CWilRow {
  const at = 'wilayat ' + row.w.i;
  return {
    ...row,
    lCL: cands(notes, row.lCL, at + ' candidate'),
    wCL: cands(notes, row.wCL, at + ' elected'),
  };
}

export function checkCountRegion(id: number, r: CountRegionResp): Checked<CountRegionResp> {
  const notes = new Notes('counting/region/' + id);
  notes.figures(r);
  const rows = uniq(notes, r.cIWL, 'w', 'wilayat');
  return {
    value: { ...r, cIWL: Array.isArray(rows) ? rows.map((row) => wilRow(notes, row)) : rows },
    issues: notes.issues,
  };
}

export function checkCountWilayat(id: number, r: CountWilayatResp): Checked<CountWilayatResp> {
  const notes = new Notes('counting/wilayat/' + id);
  notes.figures(r);
  const [row] = r?.w ? uniq(notes, [r], 'w', 'wilayat') : [r];
  return { value: row ? wilRow(notes, row) : r, issues: notes.issues };
}

export function checkInterimWilayat(id: number, r: InterimResp): Checked<InterimResp> {
  const notes = new Notes('intermediate/wilayat/' + id);
  notes.figures(r);
  const [row] = r?.w ? uniq(notes, [r], 'w', 'wilayat') : [r];
  if (!row) return { value: r, issues: notes.issues };
  return {
    value: { ...row, cL: cands(notes, row.cL, 'wilayat ' + row.w.i + ' candidate') },
    issues: notes.issues,
  };
}
