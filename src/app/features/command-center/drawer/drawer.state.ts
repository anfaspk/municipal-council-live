import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { TurnoutStore } from '../../../data/turnout.store';
import { DetailState } from '../detail/detail.state';
import { VillageDetail } from '../../../domain/stats/place';
import { Gov } from '../../../domain/stats/stats';
import { band, National, turnout } from '../../../domain/stats/turnout';
import { bandCounts, dRows, DRow, dTop, SortKey, Tab, villageList } from './drawer.model';

export interface DrawerSnap {
  g: Gov;
  rows: DRow[];
  nat: National;
  rank: number;
  of: number;
  rowsAt: string | null;
}

@Injectable()
export class DrawerState {
  private readonly stats = inject(TurnoutStore);
  private readonly page = inject(DetailState);

  readonly snap = signal<DrawerSnap | null>(null);
  readonly tab = signal<Tab>('ov');
  readonly wil = signal<string | null>(null);
  readonly wSort = signal<SortKey>('turnout');
  readonly vSort = signal<SortKey>('turnout');
  readonly q = signal('');
  readonly vOpen = signal<number | null>(null);
  readonly detail = signal<VillageDetail | null>(null);

  readonly gt = computed(() => {
    const s = this.snap();
    return s ? turnout(s.g) : 0;
  });
  readonly band = computed(() => band(this.gt()));
  readonly w = computed(() => {
    const s = this.snap(),
      n = this.wil();
    return (s && n && s.rows.find((r) => r.name === n)) || null;
  });
  readonly villages = computed(() => {
    const vil = this.w()?.vil;
    return vil ? villageList(vil, this.vSort(), this.q()) : null;
  });
  readonly bandCounts = computed(() => bandCounts(this.w()?.vil ?? null));

  constructor() {
    effect(() => {
      const list = this.villages();
      untracked(() => {
        const vid = this.vOpen();
        if (list && vid !== null && !list.some((v) => v.id === vid)) this.openVil(null);
      });
    });
  }

  take(gid: string): void {
    const g = this.stats.gov(gid);
    if (!g) return;
    this.snap.set({
      g,
      rows: dRows(g, (id) => this.stats.villages(id)),
      nat: this.stats.national(),
      rank: this.stats.rankOf(g.id),
      of: this.stats.govs().length,
      rowsAt: this.stats.wilayatAt(g.apiId),
    });
    this.readDetail();
  }
  chooseWil(): DRow | null {
    const rows = this.snap()?.rows ?? [];
    let w = rows.find((r) => r.name === this.wil()) ?? null;
    if (!w) {
      w = dTop(rows) ?? null;
      if (!w) return null;
      this.wil.set(w.name);
    }
    if (!this.page.at()) this.stats.watchWilayat(w.id);
    return w;
  }
  openVil(vid: number | null): void {
    this.vOpen.set(vid);
    if (!this.page.at()) this.stats.watchVillage(vid);
    this.readDetail();
  }
  readDetail(): void {
    const vid = this.vOpen();
    this.detail.set(vid === null ? null : (this.stats.villageDetail(vid) ?? null));
  }
}
