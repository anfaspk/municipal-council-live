import {
  afterNextRender,
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../../core/screen/screen.state';
import { TurnoutStore } from '../../../../data/turnout.store';
import { fmt, pct } from '../../../../domain/format';
import { FRAME_SCOPE } from '../../../../shared/motion/frame-loop.service';
import { keyOf } from '../../../../shared/motion/screen-keys';
import { SwipeDirective } from '../../../../shared/motion/swipe.directive';
import { slimOf } from '../../../../shared/ui/appbar/appbar.model';
import { GlyphComponent } from '../../../../shared/ui/glyph.component';
import { shareLink, type Shared } from '../../../../shared/ui/share';
import { rankedModel } from '../../detail/charts/ranked.model';
import { DetailHold } from '../../detail/detail-hold';
import { type DetailAt, sameAt, upOf, writeDetail } from '../../detail/detail-url';
import { DetailState } from '../../detail/detail.state';
import { viewMove } from '../../detail/view-move';
import { FlIconComponent } from '../fl-icon.component';
import { FpTPipe } from './fp-t.pipe';
import { fp } from './page-strings';

import { LIST_SORTS, PAGE_TABS, type PageSort, type PageTab, tabOf, tabStep } from './page.model';
import { PageAgesComponent } from './page-ages.component';
import { PageColsComponent } from './page-cols.component';
import { PageGenderComponent } from './page-gender.component';
import { PageHoursComponent } from './page-hours.component';
import { PageListComponent } from './page-list.component';
import { PageRateComponent } from './page-rate.component';
import { PageRegionComponent } from './page-region.component';
import { PageVilsComponent } from './page-vils.component';
import { PageView } from './page.view';
import { FollowPref } from '../follow-pref';
import { compOf } from '../flow.model';
import { ViewportState } from '../../../../core/screen/viewport.state';
import { band } from '../../../../domain/stats/turnout';

@Component({
  selector: 'div[flPage]',
  imports: [
    FlIconComponent,
    FpTPipe,
    GlyphComponent,
    SwipeDirective,
    PageAgesComponent,
    PageColsComponent,
    PageGenderComponent,
    PageHoursComponent,
    PageListComponent,
    PageRateComponent,
    PageRegionComponent,
    PageVilsComponent,
  ],
  providers: [DetailHold, PageView, { provide: FRAME_SCOPE, useValue: 'detail' }],
  host: { class: 'fl-pg', role: 'region', '[attr.aria-label]': 'label()' },
  templateUrl: './flow-page.component.html',
  styleUrls: ['./page.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowPageComponent {
  readonly shared = output<Shared>();
  protected readonly v = inject(PageView);
  protected readonly detail = inject(DetailState);
  private readonly stats = inject(TurnoutStore);
  private readonly screen = inject(ScreenState);
  private readonly injector = inject(Injector);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly sent = viewChild<ElementRef<HTMLElement>>('sent');
  private readonly tabsBar = viewChild<ElementRef<HTMLElement>>('tabsBar');

  protected readonly slim = signal(false);
  private readonly viewport = inject(ViewportState);
  protected readonly wide = computed(() => {
    const { w, h } = this.viewport.size();
    return compOf(w, h, this.viewport.anyCoarse()) === 'split';
  });
  protected readonly sibs = computed(() => {
    const list = this.v.villages(),
      at = this.detail.at();
    if (!list?.length || at?.vil === undefined) return null;
    return [...list]
      .sort((a, b) => a.rank - b.rank)
      .map((x) => ({
        id: x.id,
        ar: x.ar,
        rank: x.rank,
        t: x.t,
        pct: pct(x.t),
        band: band(x.t),
        on: x.id === at.vil,
      }));
  });
  private readonly follow = inject(FollowPref);
  protected readonly followAt = computed(() => {
    const at = this.detail.at();
    return at && at.vil === undefined ? { gov: at.gov, wil: at.wil ?? null } : null;
  });
  protected readonly followed = computed(() => {
    const f = this.followAt();
    return !!f && this.follow.is(f);
  });
  private readonly kept = this.detail.tabs;
  protected readonly tabs = computed(() => PAGE_TABS[this.v.level() ?? 'gov']);
  protected readonly tab = computed(() => tabOf(this.v.level() ?? 'gov', this.kept()));
  protected readonly fmt = fmt;
  protected readonly sorts = LIST_SORTS;
  protected readonly sort = signal<PageSort>('turnout');
  protected readonly label = computed(() => fp('flPgL', { p: this.v.head()?.title ?? '…' }));
  protected readonly crumbLine = computed(() =>
    this.v
      .crumbs()
      .map((c) => c.label)
      .join(' › '),
  );
  protected readonly wils = computed(() =>
    (this.v.gov()?.wils ?? []).map((w) => ({ id: w.id, name: w.name, reg: w.reg, voted: w.voted })),
  );
  protected readonly ranking = computed(() => {
    const s = this.sort();
    return rankedModel(this.wils(), s === 'low' ? 'turnout' : s, this.v.t()).rows;
  });

  constructor() {
    const key = (e: KeyboardEvent) => this.key(e),
      move = this.detail.move;
    document.addEventListener('keydown', key, true);
    this.detail.move = viewMove(inject(ApplicationRef).injector);
    const io = new IntersectionObserver(([e]) => {
      if (e)
        this.slim.set(
          slimOf({
            intersecting: e.isIntersecting,
            top: e.boundingClientRect.top,
            rootTop: e.rootBounds?.top ?? 0,
          }),
        );
    });
    effect(() => {
      const s = this.sent()?.nativeElement;
      io.disconnect();
      if (s) io.observe(s);
    });
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', key, true);
      this.detail.move = move;
      io.disconnect();
      this.stats.release(this);
    });
    effect(() => {
      const g = this.v.gov()?.apiId;
      untracked(() =>
        g === undefined ? this.stats.release(this) : this.stats.needRegions(this, [g]),
      );
    });
    let level: string | null = null;
    effect(() => {
      const l = this.v.level();
      if (!l || l === level) return;
      level = l;
      untracked(() =>
        afterNextRender(
          () => {
            document.scrollingElement?.scrollTo({ top: 0 });
            this.host.querySelector<HTMLElement>('.fl-pg-name')?.focus({ preventScroll: true });
          },
          { injector: this.injector },
        ),
      );
    });
  }

  protected go(to: { at: DetailAt } | null): void {
    if (to) this.detail.sibling(to.at);
  }
  protected crumb(to: DetailAt | null): void {
    const at = this.detail.at();
    if (!to) this.detail.close();
    else if (at && sameAt(to, upOf(at))) this.detail.up();
    else this.detail.open(to);
  }
  protected pickTab(t: PageTab): void {
    const l = this.v.level(),
      bar = this.tabsBar()?.nativeElement;
    if (!l || t === this.tab()) return;
    const stuck =
      !!bar && bar.getBoundingClientRect().top <= parseFloat(getComputedStyle(bar).top) + 1;
    this.kept.update((k) => ({ ...k, [l]: t }));
    if (stuck)
      afterNextRender(
        () => {
          const sec = this.host.querySelector<HTMLElement>('.fl-pg-sec');
          if (sec && bar)
            scrollBy({ top: sec.getBoundingClientRect().top - bar.getBoundingClientRect().bottom });
        },
        { injector: this.injector },
      );
  }
  protected openWil(wil: number): void {
    const at = this.detail.at();
    if (at) this.detail.open({ gov: at.gov, wil });
  }
  protected siblingWil(wil: number): void {
    const at = this.detail.at();
    if (at) this.detail.sibling({ gov: at.gov, wil });
  }
  protected openVil(vil: number): void {
    const at = this.detail.at();
    if (at?.wil !== undefined) this.detail.open({ gov: at.gov, wil: at.wil, vil });
  }
  protected siblingVil(vil: number): void {
    const at = this.detail.at();
    if (at?.wil !== undefined) this.detail.sibling({ gov: at.gov, wil: at.wil, vil });
  }
  protected toggleFollow(): void {
    const f = this.followAt();
    if (f) this.follow.toggle(f);
  }
  protected async share(): Promise<void> {
    const at = this.detail.at(),
      h = this.v.head();
    if (!at || !h) return;
    const url = location.origin + location.pathname + writeDetail(at, '');
    this.shared.emit(await shareLink({ title: h.title ?? '', text: this.label(), url }));
  }

  private key(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!this.detail.at() || !this.screen.is('dashboard')) return;
    const el = e.target as Element | null;
    if (el?.closest?.('dialog')) return;
    if (keyOf(e) === 'Escape') {
      e.preventDefault();
      this.detail.up();
      return;
    }
    if (el?.closest?.('input, select, textarea, [contenteditable="true"], [data-keys]')) return;
    const h = this.v.head();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const to = e.key === 'ArrowLeft' ? h?.next : h?.prev;
      if (!to) return;
      e.preventDefault();
      this.detail.sibling(to.at);
    } else if (e.key === '/') {
      const q = this.host.querySelector<HTMLElement>('input[type="search"]');
      if (!q) return;
      e.preventDefault();
      q.focus();
    }
  }
  protected tabKey(e: KeyboardEvent): void {
    const l = this.v.level(),
      to = l ? tabStep(l, this.tab(), e.key) : null;
    if (!to) return;
    e.preventDefault();
    this.pickTab(to);
    afterNextRender(() => this.host.querySelector<HTMLElement>('#fl-pg-t-' + to)?.focus(), {
      injector: this.injector,
    });
  }
}
