import { GEO } from '../geo/geo.data';
import { num, placeName, Ref } from '../stats/stats';
import { cleanText } from '../validate/text';
import {
  candInitials,
  CCand,
  CCandRow,
  CGov,
  CountOverallResp,
  CountRegionResp,
  countRace,
  CountWilayatResp,
  CWil,
  CWilRow,
  hasConflict,
  PHOTO_BASE,
  published,
  shareOf,
  SHOW_WINNERS,
  statusOf,
  tieDrawn,
} from './count';

export const photoOf = (
  c?: { im?: string; imu?: string; iml?: string } | null,
): string | undefined => {
  for (const k of ['iml', 'imu'] as const) {
    const u = typeof c?.[k] === 'string' ? c[k].trim() : '';
    if (/^https?:\/\//i.test(u)) return u;
  }
  const f = typeof c?.im === 'string' ? c.im.trim() : '';
  return PHOTO_BASE && f ? PHOTO_BASE + f : undefined;
};

const place = (x: unknown): number | null => {
  const n = num(x);
  return n !== null && n >= 1 && Number.isInteger(n) ? n : null;
};

export interface CountAnswers {
  overall?: CountOverallResp;
  regions?: ReadonlyMap<number, CountRegionResp>;
  details?: ReadonlyMap<number, CountWilayatResp>;
}

export function reduceCount(prev: CGov[], answers: CountAnswers, winners = SHOW_WINNERS): CGov[] {
  let govs = prev;
  const { overall, regions, details } = answers;
  if (overall)
    govs = withGovs(
      govs,
      (overall.cIRL || []).filter((x) => x && x.r).map((x) => x.r),
    );
  if (regions)
    govs = mapList(govs, (g) => {
      const r = regions.get(g.apiId);
      return r
        ? withRows(
            g,
            (r.cIWL || []).filter((row) => row && row.w),
            false,
            winners,
          )
        : g;
    });
  if (details)
    govs = mapList(govs, (g) => {
      const rows = g.wil
        .map((w) => details.get(w.id))
        .filter((row): row is CountWilayatResp => !!row);
      return rows.length ? withRows(g, rows, true, winners) : g;
    });
  return govs;
}

export function blankWil(gid: string, id: number, n: string): CWil {
  return {
    id,
    gid,
    n,
    ar: n,
    cast: 0,
    counted: 0,
    m: 0,
    f: 0,
    st: 'await',
    seats: 0,
    pt: (GEO.wilPt[gid] || []).find((x) => x.i === id)?.c || null,
    cands: [],
    leaders: [],
    nota: 0,
    notaP: null,
    conflict: null,
    drawn: false,
    published: false,
    detail: false,
  };
}

function withGovs(govs: CGov[], refs: Ref[]): CGov[] {
  const out = govs.slice(),
    at = new Map<number, number>();
  out.forEach((g, i) => {
    if (!at.has(g.apiId)) at.set(g.apiId, i);
  });
  refs.forEach((r) => {
    const n = placeName(r.n),
      i = at.get(r.i);
    if (i === undefined) {
      at.set(r.i, out.length);
      out.push({ id: String(r.i), apiId: r.i, ar: n, wil: [] });
    } else if (n && out[i]!.ar !== n) out[i] = { ...out[i]!, ar: n };
  });
  return sameList(out, govs) ? govs : out;
}

function withRows(g: CGov, rows: CWilRow[], detail: boolean, winners: boolean): CGov {
  const wil = g.wil.slice(),
    at = new Map<number, number>();
  wil.forEach((w, i) => {
    if (!at.has(w.id)) at.set(w.id, i);
  });
  rows.forEach((row) => {
    const n = placeName(row.w.n),
      i = at.get(row.w.i);
    if (i === undefined) {
      at.set(row.w.i, wil.length);
      wil.push(applyRow(blankWil(g.id, row.w.i, n), row, detail, winners));
      return;
    }
    const old = wil[i]!,
      w = !detail && n && (old.n !== n || old.ar !== n) ? { ...old, n, ar: n } : old;
    wil[i] = applyRow(w, row, detail, winners);
  });
  return sameList(wil, g.wil) ? g : { ...g, wil };
}

function applyRow(w: CWil, r: CWilRow, detail: boolean, winners: boolean): CWil {
  const lcl = r.lCL || [],
    wcl = r.wCL || [];
  let cands = w.cands;
  if (detail || (!w.detail && (lcl.length || wcl.length)))
    cands = mergeCands(cands, lcl.length ? lcl : wcl);
  cands = markWinners(cands, wcl, w.cands);
  if (sameList(cands, w.cands)) cands = w.cands;
  const text = (r.cFT || '').trim(),
    res = r.cFRS || '';
  const drawn = tieDrawn(r),
    conflict =
      published(r) || !hasConflict(r) || drawn
        ? null
        : w.conflict && w.conflict.text === text && w.conflict.res === res
          ? w.conflict
          : { text, res };
  const counted = num(r.c?.t) ?? w.counted,
    nota = detail ? (num(r.nV?.v) ?? w.nota) : w.nota;
  const next: CWil = {
    ...w,
    seats: place(r.m) ?? w.seats,
    cast: num(r.v?.t) ?? w.cast,
    counted,
    m: num(r.v?.m) ?? w.m,
    f: num(r.v?.f) ?? w.f,
    st: statusOf(r, winners, counted),
    conflict,
    drawn,
    published: published(r),
    cands,
    nota,
    notaP: detail ? (nota === w.nota && r.nV?.vP == null ? w.notaP : shareOf(r.nV?.vP)) : w.notaP,
    detail: detail || w.detail,
  };
  const leaders = countRace(next).top.map((c) => c.id);
  next.leaders = sameList(leaders, w.leaders) ? w.leaders : leaders;
  return sameFields(next, w) ? w : next;
}

function mergeCands(cands: CCand[], rows: CCandRow[]): CCand[] {
  const by = new Map(cands.map((c) => [c.id, c]));
  const out = rows
    .filter((r) => r && r.c)
    .map((r): CCand => {
      const id = String(r.c.i),
        c = by.get(id),
        v = num(r.v) ?? c?.v ?? 0,
        rank = place(r.p) ?? c?.rank ?? 0,
        vP = r.vP == null && c && c.v === v ? c.vP : shareOf(r.vP);
      if (c) return c.v === v && c.rank === rank && c.vP === vP ? c : { ...c, v, rank, vP };
      const nm = cleanText(r.c.n);
      return {
        id,
        ar: nm,
        ini: candInitials(nm),
        v,
        vP,
        rank,
        win: 0,
        photo: photoOf(r.c),
      };
    });
  return sameList(out, cands) ? cands : out;
}
function markWinners(cands: CCand[], rows: CCandRow[], before: CCand[]): CCand[] {
  const valid = (rows || []).filter((r) => r && r.c),
    seat = new Map(valid.map((r, i) => [String(r.c.i), place(r.p) ?? i + 1]));
  const known = new Set(cands.map((c) => c.id)),
    miss = valid.filter((r) => !known.has(String(r.c.i)));
  const all = miss.length ? cands.concat(mergeCands(before, miss)) : cands;
  const out = all.map((c) => {
    const win = seat.get(c.id) || 0;
    return c.win === win ? c : { ...c, win };
  });
  return sameList(out, cands) ? cands : out;
}

function mapList<T>(list: T[], fn: (x: T) => T): T[] {
  const out = list.map(fn);
  return sameList(out, list) ? list : out;
}
function sameList<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
function sameFields<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((k) => a[k] === b[k]);
}
