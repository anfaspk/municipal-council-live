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
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { TurnoutStore } from '../../../data/turnout.store';
import { FRAME_SCOPE } from '../../../shared/motion/frame-loop.service';
import { IconComponent } from '../../../shared/ui/icon.component';
import { DetailAt, sameAt, upOf } from './detail-url';
import { fmt } from '../../../domain/format';
import { dt, dtParts } from './detail-strings';
import { detailHead } from './detail.model';
import { ChartTip } from './charts/chart-tip';
import { LIVE_COUNT_UPS } from './charts/live-count';
import { DetailHold } from './detail-hold';
import { DetailState } from './detail.state';
import { DtTPipe } from './dt-t.pipe';
import { DetailFlight } from './gov/flight';
import { GovPageComponent } from './gov/gov-page.component';
import { VilPageComponent } from './vil/vil-page.component';
import { WilPageComponent } from './wil/wil-page.component';
import { viewMove } from './view-move';

@Component({
  selector: 'div.dt-page',
  imports: [DtTPipe, GovPageComponent, IconComponent, VilPageComponent, WilPageComponent],
  providers: [
    DetailHold,
    DetailFlight,
    ChartTip,
    LIVE_COUNT_UPS,
    { provide: FRAME_SCOPE, useValue: 'detail' },
  ],
  host: {
    role: 'region',
    '[attr.aria-label]': 'label()',
    '[class.dt-gov]': 'head()?.level === "gov"',
    '[class.dt-wil]': 'head()?.level === "wil"',
    '[class.dt-vil]': 'head()?.level === "vil"',
  },
  templateUrl: './detail-page.component.html',
  styleUrls: ['./detail.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPageComponent {
  protected readonly detail = inject(DetailState);
  private readonly hold = inject(DetailHold);
  protected readonly stats = inject(TurnoutStore);
  private readonly screen = inject(ScreenState);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);

  protected readonly head = computed(() => {
    const at = this.detail.at();
    this.hold.tick();
    if (!at) return null;
    const vils = at.wil === undefined ? undefined : this.stats.villages(at.wil);
    return detailHead(at, this.stats.govs(), vils, dt('tvOman'));
  });
  protected readonly updated = computed(() => {
    const at = this.detail.at();
    this.hold.tick();
    if (!at) return null;
    const s =
      at.vil !== undefined
        ? this.stats.villageDetail(at.vil)?.at
        : at.wil !== undefined
          ? this.stats.wilayat(at.wil)?.at
          : this.stats.gov(at.gov)?.at;
    return s ?? null;
  });
  protected readonly figs = computed(() => {
    const at = this.detail.at();
    this.hold.tick();
    if (!at) return null;
    const g = this.stats.gov(at.gov),
      w = at.wil === undefined ? undefined : g?.wils.find((x) => x.id === at.wil),
      d = at.vil === undefined ? undefined : this.stats.villageDetail(at.vil),
      v =
        at.vil === undefined
          ? undefined
          : this.stats.villages(at.wil!)?.find((x) => x.id === at.vil),
      x =
        at.vil !== undefined
          ? d
            ? { voted: d.voted.t, reg: d.reg.t }
            : v
          : at.wil !== undefined
            ? w
            : g;
    if (!x || !(x.reg > 0)) return null;
    return dtParts(x.voted > 0 ? 'dtSum' : 'dtSum0', { v: fmt(x.voted), r: fmt(x.reg) }, [
      'v',
      'r',
    ]);
  });
  protected readonly label = computed(() => dt('dtPageL', { p: this.head()?.title ?? '…' }));

  constructor() {
    const key = (e: KeyboardEvent) => this.key(e),
      move = this.detail.move;
    document.addEventListener('keydown', key, true);
    this.detail.move = viewMove(inject(ApplicationRef).injector);
    if (this.detail.at()?.wil !== undefined) inject(DetailFlight).take();
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('keydown', key, true);
      this.detail.move = move;
    });
    effect(() => {
      const at = this.detail.at();
      if (at) untracked(() => this.focusTitle());
    });
  }

  protected go(to: DetailAt | null, sibling = false): void {
    if (!to) this.detail.close();
    else if (sibling) this.detail.sibling(to);
    else this.detail.open(to);
  }
  protected crumbGo(to: DetailAt | null): void {
    const at = this.detail.at();
    if (to && at && sameAt(to, upOf(at))) this.detail.up();
    else this.go(to);
  }

  private focusTitle(): void {
    afterNextRender(
      () => this.host.querySelector<HTMLElement>('.dt-title')?.focus({ preventScroll: true }),
      { injector: this.injector },
    );
  }
  private key(e: KeyboardEvent): void {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!this.detail.at() || !this.screen.is('dashboard')) return;
    const el = e.target as Element | null,
      field = !!el?.closest?.('input, select, textarea, [contenteditable="true"]');
    if (e.key === 'Escape') {
      e.preventDefault();
      this.detail.up();
      return;
    }
    if (field) return;
    const h = this.head();
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
}
