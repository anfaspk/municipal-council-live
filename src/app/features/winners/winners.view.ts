import { computed, inject, Injectable } from '@angular/core';
import { WinnersStore } from '../../data/winners.store';
import { announcedOf, WRegion } from '../../domain/winners/winners';
import { wt } from './winners-strings';
import { govCards } from './winners.model';

function named(r: WRegion | null): WRegion | null {
  if (!r || (r.name && r.wils.every((w) => w.name))) return r;
  return {
    ...r,
    name: r.name || wt('wnGovWord'),
    wils: r.wils.map((w) => (w.name ? w : { ...w, name: wt('wnWilayat') })),
  };
}

@Injectable()
export class WinnersView {
  private readonly store = inject(WinnersStore);

  readonly cards = computed(() => govCards());
  readonly sums = this.store.summaries;
  readonly data = computed(() => named(this.store.data()));
  readonly load = this.store.load;
  readonly stale = this.store.stale;
  readonly wils = computed(() => this.data()?.wils ?? []);
  readonly tally = computed(() => announcedOf(this.store.data()));
  readonly stamp = computed(() => {
    const at = this.store.updatedAt();
    return at ? wt(this.store.stale() ? 'wnStale' : 'wnUpdated', { at }) : null;
  });
}
