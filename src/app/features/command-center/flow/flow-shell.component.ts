import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { t } from '../../../core/i18n/i18n';
import { ScreenState } from '../../../core/screen/screen.state';
import { ViewportState } from '../../../core/screen/viewport.state';
import { TickerStore } from '../../../data/ticker.store';
import { name, pct } from '../../../domain/format';
import { AppbarComponent } from '../../../shared/ui/appbar/appbar.component';
import type { Detent } from '../../../shared/ui/sheet/sheet-detent.model';
import { SheetComponent } from '../../../shared/ui/sheet/sheet.component';
import type { Shared } from '../../../shared/ui/share';
import { ScreenUpdates, type ScreenEvent } from '../../screens/screen-updates';
import { CommandCenterState } from '../command-center.state';
import type { DetailAt } from '../detail/detail-url';
import { DetailState } from '../detail/detail.state';
import { tickWords } from '../ticker/tick-words';
import { DashboardView } from './dashboard.view';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';
import { FlowBarComponent } from './flow-bar.component';
import { FlowGovSheetComponent } from './flow-gov-sheet.component';
import { FlowGovsComponent } from './flow-govs.component';
import { FlowHeroComponent } from './flow-hero.component';
import { FlowInsightsComponent } from './flow-insights.component';
import { FlowKpisComponent } from './flow-kpis.component';
import { FlowLatestComponent } from './flow-latest.component';
import { FlowMenuComponent } from './flow-menu.component';
import { FlowPulseComponent } from './flow-pulse.component';
import { FlowPageComponent } from './page/flow-page.component';
import { FlowFollowComponent } from './flow-follow.component';
import { FlowSinceComponent } from './flow-since.component';
import { FollowPref } from './follow-pref';
import { FlowPodiumComponent } from './flow-podium.component';
import { FlowWideComponent } from './flow-wide.component';
import { BallotComponent } from '../hero/ballot/ballot.component';
import { compOf } from './flow.model';
import { fl } from './flow-strings';


const TOUR = 10_000;

type Said = Extract<ScreenEvent, { type: 'cross' | 'milestone' | 'complete' }>;

@Component({
  selector: 'div[ccFlow]',
  imports: [
    FlTPipe,
    FlIconComponent,
    AppbarComponent,
    SheetComponent,
    FlowHeroComponent,
    FlowKpisComponent,
    FlowPulseComponent,
    FlowGovsComponent,
    FlowInsightsComponent,
    FlowLatestComponent,
    FlowBarComponent,
    FlowMenuComponent,
    FlowGovSheetComponent,
    FlowPageComponent,
    FlowFollowComponent,
    FlowSinceComponent,
    FlowPodiumComponent,
    FlowWideComponent,
    BallotComponent,
  ],
  providers: [DashboardView],
  styleUrls: ['./flow.scss'],
  host: { class: 'cc-dash fl-shell', '[attr.data-comp]': 'comp()' },
  templateUrl: './flow-shell.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowShellComponent {
  protected readonly view = inject(DashboardView);
  protected readonly state = inject(CommandCenterState);
  protected readonly detail = inject(DetailState);
  protected readonly follow = inject(FollowPref);
  private readonly ticker = inject(TickerStore);
  private readonly screen = inject(ScreenState);
  private readonly viewport = inject(ViewportState);
  private readonly injector = inject(Injector);
  protected readonly heading = t('title').split(' · ')[0] ?? t('title');
  protected readonly gid = signal<string | null>(null);
  protected readonly sheetOpen = signal(false);
  protected readonly detent = signal<Detent>('peek');
  protected readonly menuOpen = signal(false);
  protected readonly allOpen = signal(false);
  protected readonly toast = signal<{ title: string; sub: string } | null>(null);
  protected readonly comp = computed(() => {
    const { w, h } = this.viewport.size();
    return compOf(w, h, this.viewport.anyCoarse());
  });
  private readonly chosen = signal<string | null>(null);
  protected readonly pane = computed(() => {
    const rows = this.view.rows();
    const c = this.chosen();
    return c && rows.some((r) => r.id === c) ? c : (rows.find((r) => r.rank === 1)?.id ?? null);
  });
  protected readonly tour = signal<string | null>(null);
  protected readonly side = computed(
    () => this.viewport.layout().aspect >= 1.6 || this.comp() === 'port',
  );
  protected readonly sheetLabel = computed(() => {
    const g = this.gid();
    return (g && this.view.rows().find((r) => r.id === g)?.ar) || fl('flGov');
  });
  protected readonly allLines = computed(() =>
    this.ticker.ticks().map((tick) => ({ tick, parts: tickWords(tick) })),
  );
  private readonly live = viewChild.required<ElementRef<HTMLElement>>('live');
  private said: Said | null = null;
  private toastT?: ReturnType<typeof setTimeout>;

  constructor() {
    const updates = inject(ScreenUpdates);
    updates.now.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.type === 'cross' || e.type === 'milestone' || e.type === 'complete') this.announce(e);
      if (e.type === 'milestone') this.say(t('milestone', { p: e.p + '%' }), t('milestoneSub'));
    });
    let at = 0,
      paged = !!this.detail.at();
    const kept = () => {
      if (!this.detail.at()) at = scrollY;
    };
    addEventListener('scroll', kept, { passive: true });
    inject(DestroyRef).onDestroy(() => removeEventListener('scroll', kept));
    effect(() => {
      const now = !!this.detail.at();
      if (now === paged) return;
      paged = now;
      if (!now) afterNextRender(() => scrollTo({ top: at }), { injector: this.injector });
    });
    effect((onCleanup) => {
      if (this.comp() !== 'sign' || !this.screen.is('dashboard')) return this.tour.set(null);
      const step = () =>
        untracked(() => {
          const ids = [...this.view.rows()].sort((a, b) => a.rank - b.rank).map((r) => r.id);
          const i = ids.indexOf(this.tour() ?? '');
          this.tour.set(ids[(i + 1) % ids.length] ?? null);
        });
      step();
      const id = setInterval(step, TOUR);
      onCleanup(() => clearInterval(id));
    });
    effect(() => {
      if (this.screen.is('dashboard')) return;
      this.live().nativeElement.textContent = '';
      this.toast.set(null);
    });
    inject(DestroyRef).onDestroy(() => clearTimeout(this.toastT));
  }

  protected openGov(id: string): void {
    if (this.comp() === 'split') return this.chosen.set(id);
    this.gid.set(id);
    this.detent.set('peek');
    this.sheetOpen.set(true);
  }
  protected openPage(at: DetailAt): void {
    if (!this.sheetOpen()) return this.detail.open(at);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      removeEventListener('popstate', go);
      this.detail.open(at);
    };
    addEventListener('popstate', go);
    setTimeout(go, 400);
    this.sheetOpen.set(false);
  }
  protected sayLive(text: string): void {
    if (this.screen.is('dashboard')) this.live().nativeElement.textContent = text;
  }
  protected note(r: Shared): void {
    if (r === 'copied') this.say(fl('flShared'), '');
    else if (r === 'shown') this.say(location.href, '');
  }
  private say(title: string, sub: string): void {
    clearTimeout(this.toastT);
    this.toast.set({ title, sub });
    this.toastT = setTimeout(() => this.toast.set(null), 4000);
  }
  private announce(e: Said): void {
    const rank = { complete: 3, milestone: 2, cross: 1 },
      first = !this.said;
    if (!first && rank[e.type] <= rank[this.said!.type]) return;
    this.said = e;
    if (first)
      queueMicrotask(() => {
        const s = this.said;
        this.said = null;
        if (!s || !this.screen.is('dashboard')) return;
        this.live().nativeElement.textContent =
          s.type === 'complete'
            ? t('finalCount') + ': ' + pct(this.view.nat().t)
            : s.type === 'milestone'
              ? t('milestone', { p: s.p + '%' })
              : t('passes', { g: name(s.gov), p: s.p + '%' });
      });
  }
}
