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
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenUpdates } from '../../screens/screen-updates';
import { DetailState } from '../detail/detail.state';
import { CountUpGroup } from '../../../shared/motion/count-up.directive';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { flushStyle, restartAnimation } from '../../../shared/motion/restart-animation';
import { IconComponent, IconName } from '../../../shared/ui/icon.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { DrawerOverviewComponent } from './drawer-overview.component';
import { DrawerVillagesComponent } from './drawer-villages.component';
import { DrawerWilayatComponent } from './drawer-wilayat.component';
import { SortKey, Tab, tabDir, tabKey, TABS } from './drawer.model';
import { DrawerState } from './drawer.state';

const TAB_ITEMS: { k: Tab; icon: IconName; label: string }[] = [
  { k: 'ov', icon: 'gauge', label: 'tabOverview' },
  { k: 'wil', icon: 'layers', label: 'tabWil' },
  { k: 'vil', icon: 'village', label: 'tabVil' },
];
const SETTLE_MS = 1100;

@Component({
  selector: 'div.mj-drawer',
  imports: [
    IconComponent,
    TPipe,
    DrawerOverviewComponent,
    DrawerWilayatComponent,
    DrawerVillagesComponent,
  ],
  providers: [DrawerState, CountUpGroup],
  host: {
    '[class.on]': 'open()',
    '[attr.aria-hidden]': 'open() ? "false" : "true"',
    '[class.low]': 'drawer.snap() && drawer.band() === "low"',
    '[class.mid]': 'drawer.snap() && drawer.band() === "mid"',
    '[class.high]': 'drawer.snap() && drawer.band() === "high"',
  },
  templateUrl: './drawer.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerComponent {
  protected readonly state = inject(CommandCenterState);
  protected readonly drawer = inject(DrawerState);
  protected readonly tabs = TAB_ITEMS;
  protected readonly open = signal(false);
  protected readonly crumbWil = computed(() =>
    this.drawer.tab() === 'vil' ? this.drawer.wil() : null,
  );
  protected readonly vilCount = computed(() => {
    const n = this.drawer.w()?.vil?.length;
    return n === undefined ? '' : String(n);
  });

  private readonly stats = inject(TurnoutStore);
  private readonly page = inject(DetailState);

  private readonly updates = inject(ScreenUpdates);
  private readonly counters = inject(CountUpGroup);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private gid: string | null = null;
  private hot: string | null = null;
  private animAt = 0;
  private later: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const id = this.state.pinned();
      untracked(() => this.follow(id));
      if (id) prefetchPages();
    });
    effect(() => {
      if (!this.page.at()) untracked(() => this.rewatch());
    });
    this.state.wilPicked.pipe(takeUntilDestroyed()).subscribe((n) => this.selectWil(n));
    this.updates.now.pipe(takeUntilDestroyed()).subscribe((e) => {
      if ((e.type === 'change' && this.gid === e.id) || (e.type === 'resume' && this.gid))
        this.refresh();
      if (e.type === 'villages' && e.wid === this.wid()) this.refresh();
      if (e.type === 'village' && e.vid === this.drawer.vOpen()) this.drawer.readDetail();
    });
    this.host.addEventListener('pointerover', (e) => {
      const x = (e.target as Element).closest('.dw-wr,.dw-wc'),
        n = x ? x.getAttribute('data-w') : null;
      if (n === this.hot) return;
      this.hot = n;
      this.state.wilHot.set(n);
    });
    this.host.addEventListener('pointerleave', () => {
      this.hot = null;
      this.state.wilHot.set(null);
    });
    inject(DestroyRef).onDestroy(() => {
      if (this.later) clearTimeout(this.later);
    });
  }

  private follow(id: string | null): void {
    if (id === this.gid) return;
    if (!id) {
      this.hide();
      return;
    }
    const wil = this.openGov(id, this.gid === null);
    this.open.set(true);
    if (wil) this.state.wilSel.set(wil);
  }
  private openGov(gid: string, first: boolean): string | null {
    const d = this.drawer;
    if (!this.stats.gov(gid)) return null;
    if (first) {
      d.tab.set('ov');
      d.openVil(null);
    }
    this.gid = gid;
    d.wil.set(null);
    d.q.set('');
    this.hot = null;
    d.take(gid);
    if (d.tab() === 'vil') d.chooseWil();
    this.build();
    return d.wil();
  }
  private hide(): void {
    this.gid = null;
    this.hot = null;
    if (this.later) clearTimeout(this.later);
    this.later = null;
    this.stats.watchWilayat(null);
    this.stats.watchVillage(null);
    this.open.set(false);
  }

  private rewatch(): void {
    const d = this.drawer;
    if (!this.gid) return;
    if (d.wil()) d.chooseWil();
    else this.stats.watchWilayat(null);
    this.stats.watchVillage(d.vOpen());
  }
  protected openPage(wil?: number, vil?: number): void {
    const gov = this.gid;
    if (!gov) return;
    if (wil === undefined) this.page.open({ gov });
    else if (vil === undefined) this.page.open({ gov, wil });
    else this.page.open({ gov, wil, vil });
  }
  protected openVilPage(vid: number): void {
    const w = this.wid();
    if (w !== null) this.openPage(w, vid);
  }

  private wid(): number | null {
    const w = this.gid
      ? this.stats.gov(this.gid)?.wils.find((x) => x.name === this.drawer.wil())
      : null;
    return w ? w.id : null;
  }
  private pane(k: Tab): HTMLElement | null {
    return this.host.querySelector<HTMLElement>('.dw-pane[data-tab="' + k + '"]');
  }
  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }

  private build(): void {
    this.afterRender(() => {
      const host = this.host,
        ink = host.querySelector<HTMLElement>('.dw-ink'),
        tab = host.querySelector<HTMLElement>('.dw-tab[aria-selected="true"]');
      host.classList.add('dw-new');
      TABS.forEach((k) => {
        const p = this.pane(k)!;
        p.classList.remove('on', 'dw-anim');
        p.style.removeProperty('--dx');
        p.scrollTop = 0;
      });
      const pick = host.querySelector('.dw-wpick');
      if (pick) pick.scrollLeft = 0;
      ink?.style.removeProperty('width');
      ink?.style.removeProperty('transform');
      tab?.setAttribute('aria-selected', 'false');
      void host.offsetWidth;
      host.classList.remove('dw-new');
      tab?.setAttribute('aria-selected', 'true');
      this.showPane(this.drawer.tab(), 0);
      if (!reducedMotion()) {
        restartAnimation(this.host, 'dw-in');
        this.anim(this.drawer.tab());
      }
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.ink());
    });
  }
  private refresh(): void {
    const d = this.drawer;
    if (!this.gid || !this.stats.gov(this.gid)) return;
    const wait = SETTLE_MS - (Date.now() - this.animAt);
    if (wait > 0) {
      if (!this.later)
        this.later = setTimeout(() => {
          this.later = null;
          this.refresh();
        }, wait);
      return;
    }
    TABS.forEach((k) => this.pane(k)?.classList.remove('dw-anim'));
    d.take(this.gid);
    if (d.wil()) {
      d.chooseWil();
      this.state.wilSel.set(d.wil());
    }
  }

  private showPane(tab: Tab, dir: number): void {
    const inn = this.pane(tab);
    if (!inn) return;
    TABS.forEach((k) => {
      const p = this.pane(k)!;
      if (k !== tab && p.classList.contains('on')) {
        p.style.setProperty('--dx', String(-(dir || 0)));
        p.classList.remove('on');
      }
    });
    if (!inn.classList.contains('on')) {
      inn.style.transition = 'none';
      inn.style.setProperty('--dx', String(dir || 0));
      flushStyle(inn);
      inn.style.transition = '';
      inn.classList.add('on');
    }
    this.ink();
  }
  private ink(): void {
    const on = this.host.querySelector<HTMLElement>('.dw-tab[aria-selected="true"]'),
      ink = this.host.querySelector<HTMLElement>('.dw-ink');
    if (!on || !ink) return;
    ink.style.width = on.offsetWidth + 'px';
    ink.style.transform = 'translateX(' + on.offsetLeft + 'px)';
  }
  private anim(tab: Tab): void {
    const pane = this.pane(tab);
    if (!pane || reducedMotion()) return;
    restartAnimation(pane, 'dw-anim');
    this.animAt = Date.now();
    this.counters.play(tab);
  }
  private chipCentre(smooth: boolean): void {
    const pick = this.host.querySelector<HTMLElement>('.dw-wpick'),
      chip = pick && pick.querySelector<HTMLElement>('.dw-wc.on');
    if (!pick || !chip) return;
    let x = chip.offsetLeft - (pick.clientWidth - chip.offsetWidth) / 2;
    x = -(pick.scrollWidth - pick.clientWidth - x);
    pick.scrollTo({ left: x, behavior: smooth && !reducedMotion() ? 'smooth' : 'auto' });
  }

  protected tabGo(tab: Tab): void {
    const d = this.drawer;
    if (tab === d.tab() || !this.gid) return;
    const dir = tabDir(d.tab(), tab);
    d.take(this.gid);
    if (tab === 'vil') {
      const w = d.chooseWil();
      if (w) this.state.wilSel.set(w.name);
    }
    d.tab.set(tab);
    this.afterRender(() => {
      this.showPane(tab, dir);
      this.anim(tab);
      if (tab === 'vil') this.chipCentre(false);
    });
  }
  protected tabKey(e: KeyboardEvent, from: Tab): void {
    const to = tabKey(from, e.key);
    if (!to) return;
    e.preventDefault();
    this.tabGo(to);
    this.host.querySelector<HTMLElement>('#dwt-' + to)?.focus();
  }
  protected selectWil(n: string | null): void {
    const d = this.drawer,
      g = this.gid ? this.stats.gov(this.gid) : null;
    if (!g || !n || !g.wils.some((r) => r.name === n)) return;
    if (n !== d.wil()) d.openVil(null);
    d.wil.set(n);
    d.q.set('');
    this.state.wilSel.set(n);
    d.take(this.gid!);
    d.chooseWil();
    const from = d.tab();
    d.tab.set('vil');
    this.afterRender(() => {
      const vp = this.pane('vil');
      if (vp) vp.scrollTop = 0;
      this.chipCentre(true);
      if (from !== 'vil') this.showPane('vil', -1);
      this.anim('vil');
    });
  }
  protected toggleVil(vid: number): void {
    const d = this.drawer;
    if (!this.gid) return;
    d.take(this.gid);
    d.openVil(d.vOpen() === vid ? null : vid);
    this.afterRender(() =>
      this.host
        .querySelector<HTMLElement>('.dw-vr[data-v="' + vid + '"]')
        ?.focus({ preventScroll: true }),
    );
  }
  protected search(q: string): void {
    if (!this.gid) return;
    this.drawer.q.set(q);
    this.drawer.take(this.gid);
  }
  protected sortWil(v: SortKey): void {
    if (!this.gid) return;
    this.drawer.wSort.set(v);
    this.drawer.take(this.gid);
    this.afterRender(() => this.anim('wil'));
  }
  protected sortVil(v: SortKey): void {
    if (!this.gid) return;
    this.drawer.vSort.set(v);
    this.drawer.take(this.gid);
    this.afterRender(() => this.anim('vil'));
  }
}

let pages: Promise<unknown> | null = null;
function prefetchPages(): void {
  pages ??= import('../detail/detail-page.component').catch(() => (pages = null));
}
