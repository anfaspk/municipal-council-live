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
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { SCREEN_FRAME } from '../../../../core/screen/screen.state';
import { fmt, pct } from '../../../../domain/format';
import { PointerTracker } from '../../../../shared/motion/pointer-tracker.service';
import { reducedMotion } from '../../../../shared/motion/reduced-motion';
import { uid } from '../../../../shared/ui/uid';
import { boxOf } from '../charts/chart-box';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { RegionPin, regionGeo, RegionWil } from '../region-geometry';
import { DetailState } from '../detail.state';
import { boxIn, DetailFlight, FlyBox, flyIn, flyOut, homeOf } from './flight';

const TURN = 5;

@Component({
  selector: 'div.dt-region',
  imports: [DtTPipe],
  templateUrl: './region-card.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegionCardComponent {
  readonly gid = input.required<string>();
  readonly name = input.required<string>();
  readonly rows = input.required<readonly RegionWil[]>();
  readonly hot = input<number | null>(null);
  readonly band = input('');
  readonly pick = output<number>();
  readonly hover = output<number | null>();

  protected readonly fmt = fmt;
  protected readonly pct = pct;
  private readonly box = boxOf();
  private readonly id = uid('dtr');
  protected readonly geo = computed(() => regionGeo(this.gid(), this.rows(), this.box()));
  protected readonly lit = computed(() => {
    const h = this.hot();
    return h === null ? null : (this.geo()?.pins.find((p) => p.id === h) ?? null);
  });
  protected readonly label = computed(() =>
    dt('dtRgL', { p: this.name(), n: this.geo()?.pins.length ?? 0 }),
  );

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement,
      tracker = inject(PointerTracker);
    this.fly(host);
    let turn: [number, number] | null = null;
    const tracking = tracker.track(host, {
      read: ({ move, last }) => {
        if (last.type === 'pointerleave' || reducedMotion()) turn = [0, 0];
        else if (move) {
          const r = tracker.rect(host),
            dx = (move.clientX - r.left) / r.width - 0.5,
            dy = (move.clientY - r.top) / r.height - 0.5;
          turn = [dx * 2 * TURN, -dy * 2 * TURN];
        }
      },
      write: () => {
        if (!turn) return;
        host.style.setProperty('--ry', turn[0].toFixed(2) + 'deg');
        host.style.setProperty('--rx', turn[1].toFixed(2) + 'deg');
        turn = null;
      },
    });
    inject(DestroyRef).onDestroy(() => tracking.stop());
  }

  private fly(host: HTMLElement): void {
    const frame = inject(SCREEN_FRAME),
      detail = inject(DetailState),
      injector = inject(Injector),
      app = inject(ApplicationRef);
    let armed = inject(DetailFlight).take(),
      box: FlyBox | null = null;
    effect(() => {
      const g = this.geo();
      if (!g) return;
      afterNextRender(
        () => {
          box = boxIn(host, frame);
          const from = armed && box && !reducedMotion() ? homeOf(frame, this.gid()) : null;
          if (box && from) flyIn(frame, from, box, { d: g.d, band: this.band() });
          armed = false;
        },
        { injector },
      );
    });
    inject(DestroyRef).onDestroy(() => {
      const g = this.geo();
      if (detail.at() || !box || !g || reducedMotion()) return;
      const land = flyOut(frame, box, { d: g.d, band: this.band() }, () =>
        homeOf(frame, this.gid()),
      );
      afterNextRender(land, { injector: app.injector });
    });
  }

  protected ref(k: string): string {
    return this.id + k;
  }
  protected href(k: string): string {
    return '#' + this.id + k;
  }
  protected url(k: string): string {
    return 'url(#' + this.id + k + ')';
  }
  protected say(p: RegionPin): string {
    return dt('dtPinL', { p: p.name, t: pct(p.t), n: p.voted });
  }
}
