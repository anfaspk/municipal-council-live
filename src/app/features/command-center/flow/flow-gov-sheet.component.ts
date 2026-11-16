import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../data/turnout.store';
import { fmt, pct, pctOf } from '../../../domain/format';
import { band, turnout } from '../../../domain/stats/turnout';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { shareLink, type Shared } from '../../../shared/ui/share';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { writeDetail, type DetailAt } from '../detail/detail-url';
import type { Tab } from '../drawer/drawer.model';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';
import { FollowPref } from './follow-pref';
import { fl } from './flow-strings';
import { cmpOf } from './flow.model';

const TABS: readonly { tab: Tab; key: string }[] = [
  { tab: 'ov', key: 'flTabOv' },
  { tab: 'wil', key: 'flTabWil' },
  { tab: 'vil', key: 'flTabVil' },
];

@Component({
  selector: 'div[flGovSheet]',
  imports: [TPipe, FlTPipe, FlIconComponent, GlyphComponent],
  host: { class: 'fl-gs' },
  templateUrl: './flow-gov-sheet.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowGovSheetComponent {
  readonly gid = input.required<string>();
  readonly shared = output<Shared>();
  readonly page = output<DetailAt>();
  private readonly stats = inject(TurnoutStore);
  private readonly cc = inject(CommandCenterState);
  protected readonly follow = inject(FollowPref);
  protected readonly followed = computed(() => this.follow.is({ gov: this.gid(), wil: null }));
  protected readonly tabs = TABS;
  protected readonly pct = pct;
  protected readonly fmt = fmt;
  protected readonly tab = linkedSignal<string, Tab>({
    source: this.gid,
    computation: (_, prev) => (prev ? 'ov' : untracked(this.cc.pane)),
  });
  protected readonly wid = linkedSignal<string, number | null>({
    source: this.gid,
    computation: () => null,
  });
  protected readonly vid = signal<number | null>(null);

  protected readonly gov = computed(() => this.stats.gov(this.gid()));
  protected readonly head = computed(() => {
    const g = this.gov();
    if (!g) return null;
    const t = turnout(g),
      c = cmpOf(t, this.stats.turnout());
    return {
      ar: g.ar,
      t,
      pct: pct(t),
      band: band(t),
      rank: this.stats.rankOf(g.id),
      n: this.stats.govs().length,
      cmp: fl(c.key, { p: c.p }),
      above: t >= this.stats.turnout(),
      voted: fmt(g.voted),
      reg: fmt(g.reg),
      yet: fmt(g.reg - g.voted),
      yetShare: pctOf(g.reg - g.voted, g.reg),
      m: g.regM ? pctOf(g.votedM, g.regM) : '—',
      f: g.regF ? pctOf(g.votedF, g.regF) : '—',
    };
  });
  protected readonly read = computed(() => {
    const g = this.gov();
    return !!g && this.stats.regionRead(g.apiId);
  });
  protected readonly asOf = computed(() => {
    const g = this.gov();
    return g ? this.stats.wilayatAt(g.apiId) : null;
  });
  protected readonly wils = computed(() =>
    (this.gov()?.wils ?? [])
      .map((w) => ({ id: w.id, ar: w.name, t: turnout(w), voted: w.voted }))
      .sort((a, b) => b.t - a.t)
      .map((w, i) => ({ ...w, rank: i + 1, pct: pct(w.t), band: band(w.t), votes: fmt(w.voted) })),
  );
  protected readonly vilWid = computed(() => this.wid() ?? this.wils()[0]?.id ?? null);
  protected readonly villages = computed(() => {
    const w = this.vilWid();
    void this.stats.updatedAt();
    const list = w === null ? undefined : this.stats.villages(w);
    return list
      ?.slice()
      .sort((a, b) => a.rank - b.rank)
      .map((v) => ({ ...v, pct: pct(v.t), band: band(v.t) }));
  });
  protected readonly village = computed(() => {
    const id = this.vid();
    void this.stats.updatedAt();
    const v = id === null ? undefined : this.stats.villageDetail(id);
    return v
      ? {
          voted: fmt(v.voted.t),
          vm: fmt(v.voted.m),
          vf: fmt(v.voted.f),
          not: fmt(v.notVoted.t),
          nm: fmt(v.notVoted.m),
          nf: fmt(v.notVoted.f),
          none: v.voted.t === 0,
        }
      : null;
  });

  constructor() {
    effect(() => {
      const g = this.gov(),
        need = this.tab() !== 'ov';
      untracked(() => {
        if (g && need) this.stats.needRegions(this, [g.apiId]);
        else this.stats.release(this);
      });
    });
    effect(() => {
      const t = this.tab();
      untracked(() => this.cc.pane.set(t));
    });
    effect(() => {
      const w = this.tab() === 'vil' ? this.vilWid() : null;
      untracked(() => this.stats.watchWilayat(w));
    });
    effect(() => {
      const v = this.tab() === 'vil' ? this.vid() : null;
      untracked(() => this.stats.watchVillage(v));
    });
    inject(DestroyRef).onDestroy(() => {
      this.stats.release(this);
      this.stats.watchWilayat(null);
      this.stats.watchVillage(null);
    });
  }

  protected pickWil(e: Event): void {
    this.wid.set(Number((e.target as HTMLSelectElement).value));
    this.vid.set(null);
  }
  protected toggleVil(id: number): void {
    this.vid.update((v) => (v === id ? null : id));
  }
  protected openPage(wil?: number, vil?: number): void {
    this.page.emit({
      gov: this.gid(),
      ...(wil !== undefined ? { wil } : {}),
      ...(vil !== undefined ? { vil } : {}),
    });
  }
  protected toggleFollow(): void {
    this.follow.toggle({ gov: this.gid(), wil: null });
  }
  protected async share(): Promise<void> {
    const h = this.head();
    if (!h) return;
    const url = location.origin + location.pathname + writeDetail({ gov: this.gid() }, '');
    this.shared.emit(await shareLink({ title: h.ar, text: h.cmp, url }));
  }
}
