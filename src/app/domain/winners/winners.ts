import { candInitials, shareOf } from '../count/count';
import { photoOf } from '../count/reduce';
import { kept, keptList } from '../same';
import { num, Ref } from '../stats/stats';


export interface WinnerCandRow {
  p: number;
  c: { i: number; n: string; im?: string; imu?: string; ims?: string; imm?: string; iml?: string };
  v: number;
  vP?: string;
}
export interface WinnerWilRow {
  w: Ref;
  m: number;
  d: boolean;
  wCL: WinnerCandRow[];
}
export interface WinnerResp {
  r: Ref;
  wL: WinnerWilRow[];
}


export interface WCand {
  id: number;
  name: string;
  ini: string;
  photo: string | null;
  pos: number;
  votes: number | null;
  share: number | null;
}
export interface WWil {
  id: number;
  name: string;
  seats: number | null;
  published: boolean;
  winners: WCand[];
}
export interface WRegion {
  id: number;
  name: string;
  wils: WWil[];
}

const PHOTO_SIZES = ['iml', 'imu', 'imm', 'ims'] as const;
export function bigPhoto(c: WinnerCandRow['c'] | null | undefined): string | null {
  for (const k of PHOTO_SIZES) {
    const u = typeof c?.[k] === 'string' ? c[k].trim() : '';
    if (/^https?:\/\//i.test(u)) return u;
  }
  return photoOf(c) ?? null;
}

const whole = (x: unknown): number | null => {
  const n = num(x);
  return n !== null && Number.isInteger(n) && n >= 1 ? n : null;
};

function candOf(x: WinnerCandRow, k: number, n: number): WCand | null {
  if (!x?.c) return null;
  const name = x.c.n || '';
  return {
    id: x.c.i,
    name,
    ini: candInitials(name),
    photo: bigPhoto(x.c),
    pos: whole(x.p) ?? n + k + 1,
    votes: num(x.v),
    share: shareOf(x.vP),
  };
}

const AR = new Intl.Collator('ar');

export function winnersOf(r: WinnerResp, prev: WRegion | null = null): WRegion {
  const old = new Map((prev?.wils ?? []).map((w) => [w.id, w]));
  const wils = (Array.isArray(r?.wL) ? r.wL : [])
    .filter((x) => x?.w)
    .map((x): WWil => {
      const rows = Array.isArray(x.wCL) ? x.wCL : [];
      const winners = rows
        .map((c, k) => candOf(c, k, rows.length))
        .filter((c): c is WCand => c !== null)
        .sort((a, b) => a.pos - b.pos);
      const was = old.get(x.w.i);
      const next: WWil = {
        id: x.w.i,
        name: x.w.n || '',
        seats: whole(x.m),
        published: winners.length > 0,
        winners: was
          ? keptList(
              winners.map((c, i) => kept(c, was.winners[i])),
              was.winners,
            )
          : winners,
      };
      return kept(next, was);
    })
    .sort((a, b) => AR.compare(a.name, b.name) || a.id - b.id);
  const next: WRegion = {
    id: r?.r?.i ?? prev?.id ?? 0,
    name: r?.r?.n || prev?.name || '',
    wils: prev ? keptList(wils, prev.wils) : wils,
  };
  return prev ? kept(next, prev) : next;
}

export function announcedOf(r: WRegion | null): { done: number; all: number } {
  const wils = r?.wils ?? [];
  return { done: wils.filter((w) => w.published).length, all: wils.length };
}
export const allAnnounced = (r: WRegion | null): boolean => {
  const a = announcedOf(r);
  return a.all > 0 && a.done === a.all;
};
