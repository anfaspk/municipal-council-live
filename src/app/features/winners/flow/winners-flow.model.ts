import type { Screen } from '../../../core/screen/screen-prefs';
import { fmt } from '../../../domain/format';
import type { WCand, WWil } from '../../../domain/winners/winners';
import { titled } from '../winners.model';
import { wf } from './wf-strings';

export const BAR: readonly { s: Screen; icon: 'box' | 'crown' | 'grid' | 'tv'; key: string }[] = [
  { s: 'wall', icon: 'box', key: 'wfBarCount' },
  { s: 'winners', icon: 'crown', key: 'wfBarWin' },
  { s: 'dashboard', icon: 'grid', key: 'wfBarDash' },
  { s: 'tv', icon: 'tv', key: 'wfBarTv' },
];

export type SegState = 'done' | 'on' | '';
export const segStates = (n: number, at: number): SegState[] =>
  Array.from({ length: n }, (_, i) => (i < at ? 'done' : i === at ? 'on' : ''));

export type CardSize = 'one' | 'two';
export const cardSize = (w: WWil): CardSize =>
  (w.published ? w.winners.length : (w.seats ?? 1)) <= 1 ? 'one' : 'two';

export const govKey = (id: string): string => 'g' + id;
export const govOfKey = (k: unknown): string | null =>
  typeof k === 'string' && /^g\d+$/.test(k) ? k.slice(1) : null;

export const wilUrl = (base: string, gov: string, wil: number): string =>
  base + '?screen=winner&region=' + gov + '&wil=' + wil;

export function candShare(c: WCand, w: WWil): string {
  const wil = titled(w.name, wf('wnWilayat'));
  return c.votes === null
    ? wf('wfShareTextNo', { name: c.name, wil })
    : wf('wfShareText', { name: c.name, wil, n: fmt(c.votes) });
}
export const wilShare = (w: WWil): string =>
  wf('wfShareWilText', {
    wil: titled(w.name, wf('wnWilayat')),
    names: w.winners.map((c) => c.name).join('، '),
  });
