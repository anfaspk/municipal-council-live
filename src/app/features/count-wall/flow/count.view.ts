import { computed, inject, Injectable, signal } from '@angular/core';
import { ConflictStore } from '../../../data/conflict.store';
import { CountStore } from '../../../data/count.store';
import { clockStr } from '../../../domain/format';
import { raceView } from '../../../shared/ui/race-board.model';
import { tieOf } from '../draw/draw.model';
import { govRow, headOf, NAT, natView, type Place, wilRows } from './count-flow.model';

@Injectable()
export class CountView {
  readonly store = inject(CountStore);
  private readonly conflicts = inject(ConflictStore);

  readonly place = signal<Place>(NAT);
  readonly nat = computed(() => natView(this.store.govs, 0));
  readonly rows = computed(() => this.store.govs.map(govRow));
  readonly ready = this.store.ready;
  readonly stamp = computed(() => {
    const at = this.store.updatedAt();
    return at ? clockStr(at) : '';
  });
  readonly staleAt = this.store.staleAt;

  readonly gov = computed(() => {
    const p = this.place();
    return p.k === 'nat' ? null : this.store.gov(p.gid);
  });
  readonly govRow = computed(() => {
    const g = this.gov();
    return g ? govRow(g) : null;
  });
  readonly wils = computed(() => {
    const g = this.gov();
    return g ? wilRows(g) : [];
  });
  readonly wil = computed(() => {
    const p = this.place();
    return p.k === 'wil' ? this.store.wilById(p.wid) : null;
  });
  readonly head = computed(() => {
    const w = this.wil();
    return w ? headOf(w) : null;
  });
  readonly board = computed(() => {
    const w = this.wil();
    return w ? raceView(w, this.store.history) : null;
  });
  readonly tie = computed(() => {
    const g = this.gov(),
      w = this.wil();
    return g && w ? tieOf(g, w, this.conflicts.draws(), this.conflicts.ties()) : null;
  });
  readonly drawWins = computed((): readonly string[] => {
    const t = this.tie();
    return t?.state === 'drawn' && t.draw ? t.draw.wins.map((x) => x.id) : [];
  });
  readonly tiedIds = computed((): ReadonlySet<string> => {
    const t = this.tie();
    return new Set(t?.state === 'open' ? t.tied.map((c) => c.id) : []);
  });
}
