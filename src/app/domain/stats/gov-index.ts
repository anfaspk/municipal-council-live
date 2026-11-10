import { ranksOf } from '../rank';
import { Counted, ranked, turnout } from './turnout';

export interface GovIndex<G> {
  readonly list: readonly G[];
  readonly ranked: readonly G[];
  get(id: string): G | null;
  rankOf(id: string): number;
}

export function indexGovs<G extends Counted & { id: string }>(govs: readonly G[]): GovIndex<G> {
  const byId = new Map<string, G>(),
    order = ranked(govs),
    places = ranksOf(order, turnout),
    rank = new Map<string, number>();
  govs.forEach((g) => {
    if (!byId.has(g.id)) byId.set(g.id, g);
  });
  order.forEach((g, i) => {
    if (!rank.has(g.id)) rank.set(g.id, places[i]!);
  });
  return {
    list: govs,
    ranked: order,
    get: (id) => byId.get(id) ?? null,
    rankOf: (id) => rank.get(id) ?? 0,
  };
}
