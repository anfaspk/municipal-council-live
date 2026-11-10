import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  untracked,
  ViewEncapsulation,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SCREEN_FRAME, ScreenState } from '../../core/screen/screen.state';
import { t } from '../../core/i18n/i18n';
import { TickerStore } from '../../data/ticker.store';
import { TurnoutStore } from '../../data/turnout.store';
import { ScreenEvent, ScreenUpdates } from '../screens/screen-updates';
import { name, pct } from '../../domain/format';
import { band, bandFill, turnout } from '../../domain/stats/turnout';
import { boot, BootFlag } from '../../shared/motion/boot';
import { reducedMotion } from '../../shared/motion/reduced-motion';
import { AmbientComponent } from '../../shared/ui/ambient.component';
import { BandLegendComponent } from '../../shared/ui/band-legend.component';
import { ConfettiComponent } from '../../shared/ui/confetti.component';
import { HorizonComponent } from '../../shared/ui/horizon.component';
import { starPoints } from '../../shared/ui/ornament';
import { TPipe } from '../../shared/ui/t.pipe';
import { FxService } from '../../shared/ui/toast.service';
import { CommandCenterState } from './command-center.state';
import { DetailPageComponent } from './detail/detail-page.component';
import { DetailState } from './detail/detail.state';
import { DrawerComponent } from './drawer/drawer.component';
import { HeaderComponent } from './header/header.component';
import { HeroComponent } from './hero/hero.component';
import { InsightsComponent } from './insights/insights.component';
import { KpisComponent } from './kpis/kpis.component';
import { MapFocusComponent } from './map/map-focus.component';
import { OmanMapComponent } from './map/oman-map.component';
import { PodiumComponent } from './podium/podium.component';
import { PulseComponent } from './pulse/pulse.component';
import { GovRailComponent } from './rail/gov-rail.component';
import { TickerComponent } from './ticker/ticker.component';

@Component({
  selector: 'app-command-center',
  imports: [
    AmbientComponent,
    HorizonComponent,
    TPipe,
    HeaderComponent,
    HeroComponent,
    TickerComponent,
    BandLegendComponent,
    KpisComponent,
    GovRailComponent,
    PodiumComponent,
    PulseComponent,
    OmanMapComponent,
    MapFocusComponent,
    InsightsComponent,
    DrawerComponent,
    DetailPageComponent,
    ConfettiComponent,
  ],
  host: {
    '(document:keydown)': 'key($event)',
    '(window:resize)': 'resized()',
  },
  templateUrl: './command-center.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandCenterComponent implements AfterViewInit {
  protected readonly state = inject(CommandCenterState);
  protected readonly stats = inject(TurnoutStore);
  protected readonly detail = inject(DetailState);
  private readonly updates = inject(ScreenUpdates);
  private readonly live = viewChild.required<ElementRef<HTMLElement>>('live');
  private said: Extract<ScreenEvent, { type: 'cross' | 'milestone' | 'complete' }> | null = null;
  protected readonly fx = inject(FxService);
  protected readonly star = starPoints(12, 12, 11);

  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frame = inject(SCREEN_FRAME);
  private readonly screen = inject(ScreenState);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bootFlag = inject(BootFlag);
  private drawerFor: string | null = null;
  private lastFocus: Element | null = null;
  private holeTimer?: ReturnType<typeof setTimeout>;
  private readonly tour = {
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    idx: -1,
    paused: false,
    focused: false,
  };

  constructor() {
    inject(TickerStore);
    effect(() => {
      const id = this.state.pinned();
      untracked(() => this.drawerMoved(id));
    });
    effect(() => {
      if (this.screen.is('dashboard')) untracked(() => this.tourSchedule(20000));
      else {
        clearTimeout(this.tour.timer);
        this.live().nativeElement.textContent = '';
        this.said = null;
        this.fx.toasts.set([]);
        this.fx.bursts.set([]);
      }
    });
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.tour.timer);
      clearTimeout(this.holeTimer);
    });
  }

  ngAfterViewInit(): void {
    boot(this.frame);
    this.bootFlag.first = false;
    this.tour.idx = -1;
    this.tourSchedule(20000);
    this.updates.now.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (e.type === 'cross' || e.type === 'milestone' || e.type === 'complete') this.announce(e);
      if (e.type === 'milestone') {
        this.fx.confetti(this.root, { x: 290, y: 260 });
        this.fx.toast({
          icon: 'star',
          title: t('milestone', { p: e.p + '%' }),
          sub: t('milestoneSub'),
        });
      }
    });
    this.stats.start();
  }

  private drawerMoved(id: string | null): void {
    const was = this.drawerFor;
    if (id === was) return;
    this.drawerFor = id;
    const scrim = this.root.querySelector('.mj-scrim')!;
    if (id) {
      if (!was) this.lastFocus = document.activeElement;
      this.scrimHole(true);
      scrim.classList.add('on');
      if (!was) {
        afterNextRender(() => this.ghost(id), { injector: this.injector });
        setTimeout(
          () =>
            this.root
              .querySelector<HTMLElement>('.mj-drawer .dclose')
              ?.focus({ preventScroll: true }),
          60,
        );
      }
      return;
    }
    scrim.classList.remove('on');
    this.scrimHole(false);
    this.tour.idx = -1;
    this.tourSchedule(20000);
    const lf = this.lastFocus as HTMLElement | null;
    afterNextRender(
      () => {
        if (lf && lf.focus && lf.isConnected) lf.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  private ghost(id: string): void {
    const g = this.stats.gov(id),
      root = this.frame,
      top = root.querySelector('.map-stage .rg[data-id="' + id + '"] .top'),
      drEl = root.querySelector<HTMLElement>('.mj-drawer');
    if (!g || !top || !drEl || reducedMotion()) return;
    const rect = top.getBoundingClientRect(),
      rb = root.getBoundingClientRect(),
      sc = rb.width / root.offsetWidth || 1,
      sw = drEl.querySelector<HTMLElement>('.dsw'),
      tg = turnout(g);
    const ghost = document.createElement('div');
    ghost.style.cssText =
      'position:absolute;z-index:58;border-radius:14px;pointer-events:none;transform-origin:0 0;background:' +
      bandFill(tg) +
      ';box-shadow:0 0 30px var(--band-' +
      band(tg) +
      ')';
    const x0 = (rect.left - rb.left) / sc,
      y0 = (rect.top - rb.top) / sc,
      w0 = Math.max(8, rect.width / sc),
      h0 = Math.max(8, rect.height / sc);
    ghost.style.left = x0 + 'px';
    ghost.style.top = y0 + 'px';
    ghost.style.width = w0 + 'px';
    ghost.style.height = h0 + 'px';
    root.appendChild(ghost);
    const so: [number, number] = sw ? offIn(sw, drEl) : [24, 26],
      x1 = 16 + so[0],
      y1 = 16 + so[1];
    ghost.animate(
      [
        { transform: 'none', opacity: 1 },
        {
          transform:
            'translate(' +
            (x1 - x0) +
            'px,' +
            (y1 - y0) +
            'px) scale(' +
            44 / w0 +
            ',' +
            44 / h0 +
            ')',
          opacity: 0.2,
        },
      ],
      { duration: 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' },
    ).onfinish = () => ghost.remove();
  }
  private scrimHole(on: boolean): void {
    const root = this.frame,
      sc = root.querySelector<HTMLElement>('.mj-scrim'),
      m = root.querySelector<HTMLElement>('.cc-map');
    if (!sc) return;
    clearTimeout(this.holeTimer);
    if (!on || !m) {
      this.holeTimer = setTimeout(() => {
        if (!this.state.pinned()) sc.style.clipPath = '';
      }, 520);
      return;
    }
    const W = root.offsetWidth,
      H = root.offsetHeight,
      [x, y] = offIn(m, root),
      w = m.offsetWidth,
      h = m.offsetHeight;
    const r = Math.min(parseFloat(getComputedStyle(m).borderTopLeftRadius) || 0, w / 2, h / 2),
      f = (v: number) => v.toFixed(1);
    const arc = `A${r} ${r} 0 0 1 `,
      d =
        `M0 0H${W}V${H}H0Z M${f(x + r)} ${f(y)}H${f(x + w - r)}${arc}${f(x + w)} ${f(y + r)}` +
        `V${f(y + h - r)}${arc}${f(x + w - r)} ${f(y + h)}H${f(x + r)}${arc}${f(x)} ${f(y + h - r)}` +
        `V${f(y + r)}${arc}${f(x + r)} ${f(y)}Z`;
    sc.style.clipPath = "path(evenodd, '" + d + "')";
  }
  resized(): void {
    if (this.state.pinned()) this.scrimHole(true);
  }
  key(e: KeyboardEvent): void {
    if (e.key === 'Escape' && !e.defaultPrevented && this.screen.is('dashboard'))
      this.state.close();
  }

  tourEnter(): void {
    this.tour.paused = true;
    clearTimeout(this.tour.timer);
    if (this.tour.idx >= 0) this.state.setHot(null);
  }
  tourLeave(): void {
    this.tour.paused = false;
    if (this.tour.focused) return;
    this.tourSchedule(this.tour.idx < 0 ? 20000 : 3000);
  }
  tourFocus(inside: boolean, e?: FocusEvent): void {
    if (
      !inside &&
      e?.relatedTarget instanceof Node &&
      (e.currentTarget as Node).contains(e.relatedTarget)
    )
      return;
    this.tour.focused = inside;
    if (inside) clearTimeout(this.tour.timer);
    else if (!this.tour.paused) this.tourSchedule(this.tour.idx < 0 ? 20000 : 3000);
  }
  private tourSchedule(ms: number): void {
    clearTimeout(this.tour.timer);
    if (this.screen.is('dashboard')) this.tour.timer = setTimeout(() => this.tourStep(), ms);
  }
  private tourStep(): void {
    const t = this.tour;
    if (t.paused || t.focused || this.state.held() || this.state.pinned() || reducedMotion()) {
      this.tourSchedule(2000);
      return;
    }
    const order = this.stats.ranked().map((g) => g.id);
    this.tour.idx++;
    if (this.tour.idx >= order.length) {
      this.tour.idx = -1;
      this.state.setHot(null);
      this.tourSchedule(20000);
      return;
    }
    this.state.setHot(order[this.tour.idx]!);
    this.tourSchedule(10000);
  }
  private announce(e: Extract<ScreenEvent, { type: 'cross' | 'milestone' | 'complete' }>): void {
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
            ? t('finalCount') + ': ' + pct(this.stats.national().turnout)
            : s.type === 'milestone'
              ? t('milestone', { p: s.p + '%' })
              : t('passes', { g: name(s.gov), p: s.p + '%' });
      });
  }
}
function offIn(el: HTMLElement | null, anc: HTMLElement): [number, number] {
  let x = 0,
    y = 0;
  while (el && el !== anc) {
    x += el.offsetLeft;
    y += el.offsetTop;
    el = el.offsetParent as HTMLElement | null;
  }
  return [x, y];
}
