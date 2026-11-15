import { computed, inject, Injectable } from '@angular/core';
import { TurnoutStore } from '../../data/turnout.store';
import { WinnersStore } from '../../data/winners.store';
import { announcedOf } from '../../domain/winners/winners';
import { wt } from './winners-strings';
import { govCards } from './winners.model';

@Injectable()
export class WinnersView {
  private readonly store = inject(WinnersStore);
  private readonly stats = inject(TurnoutStore);

  readonly cards = computed(() =>
    govCards(new Map(this.stats.govs().map((g) => [g.id, { name: g.ar, wils: g.wils.length }]))),
  );
  readonly sums = this.store.summaries;
  readonly data = this.store.data;
  readonly load = this.store.load;
  readonly stale = this.store.stale;
  readonly wils = computed(() => this.store.data()?.wils ?? []);
  readonly tally = computed(() => announcedOf(this.store.data()));
  readonly stamp = computed(() => {
    const at = this.store.updatedAt();
    return at ? wt(this.store.stale() ? 'wnStale' : 'wnUpdated', { at }) : null;
  });
}
