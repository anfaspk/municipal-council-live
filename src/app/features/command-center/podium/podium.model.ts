import { fmt } from '../../../domain/format';
import { Gov } from '../../../domain/stats/stats';
import { Band, band, turnout } from '../../../domain/stats/turnout';

export interface PodItem {
  id: string;
  rank: number;
  name: string;
  sub: string;
  v: number;
  lat?: boolean;
}
export interface PodView {
  key: string;
  items: PodItem[];
  animate: boolean;
  lead: number;
  gov: { name: string; band: Band } | null;
}
export function podiumView(govs: readonly Gov[], g: Gov | null, animate: boolean): PodView {
  const total = govs.reduce((sum, x) => sum + x.voted, 0);
  const items: PodItem[] = g
    ? g.wils
        .map((r) => ({
          id: g.id + ':' + r.id,
          rank: 0,
          name: r.name,
          sub: fmt(r.voted) + ' / ' + fmt(r.reg),
          v: r.reg ? (r.voted / r.reg) * 100 : 0,
          lat: true,
        }))
        .sort((a, b) => b.v - a.v)
        .slice(0, 5)
    : govs
        .slice()
        .sort((a, b) => b.voted - a.voted)
        .slice(0, 5)
        .map((x) => ({
          id: x.id,
          rank: 0,
          name: x.ar,
          sub: '',
          v: total ? (x.voted / total) * 100 : 0,
        }));
  items.forEach((it, rank) => {
    it.rank = rank;
  });
  return {
    key: g?.id ?? 'nat',
    items,
    animate,
    lead: items[0]?.v || 1,
    gov: g ? { name: g.ar, band: band(turnout(g)) } : null,
  };
}
