import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { pct } from '../../../../domain/format';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { FRAME_SCOPE, FrameLoop } from '../../../../shared/motion/frame-loop.service';
import { boxOf } from '../charts/chart-box';
import { Col, ColPlace, colsModel, colsScroll } from './cols.model';

@Component({
  selector: 'div.dt-cols',
  imports: [DtTPipe],
  template: `@let m = model();
<div class="dt-cols-plot" [style.--at]="m.at ?? 0">
  @if (m.me; as me) {
    <p class="dt-cols-me" aria-hidden="true"><b>{{ me.name }}</b><span class="mj-num">{{ pct(me.t) }} · {{ 'dtPlaceMe' | dtT: { n: me.rank, m: m.cols.length } }}</span></p>
  }
  <div class="dt-cols-area">
  <ol class="dt-cols-row" [attr.aria-label]="summary()">
    @for (c of m.cols; track c.id) {
      <li>
        @if (c.me) {
          <span class="dt-vcol me" role="img" [class]="c.band" [attr.aria-label]="say(c)" aria-current="true"><i [style.--k]="c.k"></i></span>
        } @else {
          <button type="button" class="dt-vcol" [class]="c.band" [attr.aria-label]="say(c)" [title]="say(c)" (click)="pick.emit(c.id)"><i [style.--k]="c.k"></i></button>
        }
      </li>
    }
  </ol>
  </div>
</div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.scroll]': 'scroll()', '[style.--n]': 'model().cols.length' },
})
export class ColsComponent<K = number> {
  readonly places = input.required<readonly ColPlace<K>[]>();
  readonly current = input.required<K>();
  readonly ref = input<number | null>(null);
  readonly pick = output<K>();
  protected readonly pct = pct;
  protected readonly model = computed(() => colsModel(this.places(), this.current(), this.ref()));
  private readonly box = boxOf();
  protected readonly scroll = computed(() => colsScroll(this.model().cols.length, this.box().w));

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    const frames = inject(FrameLoop),
      scope = inject(FRAME_SCOPE);
    effect((onCleanup) => {
      this.current();
      if (!this.scroll()) return;
      let by = 0,
        left = 0,
        tries = 30;
      const h = frames.add(
        {
          read: () => {
            by = 0;
            left = host.scrollLeft;
            const me = host.querySelector('.dt-vcol.me');
            if (!me) return;
            const c = host.getBoundingClientRect(),
              r = me.getBoundingClientRect(),
              k = c.width / (host.offsetWidth || 1) || 1;
            by = (r.left + r.width / 2 - (c.left + c.width / 2)) / k;
          },
          write: () => {
            if (Math.abs(by) >= 1) host.scrollLeft = left + by;
            if (--tries <= 0) h.stop();
          },
        },
        scope,
      );
      onCleanup(() => h.stop());
    });
  }
  protected readonly summary = computed(() => {
    const m = this.model();
    return dt('dtSumCols', {
      n: m.cols.length,
      p: m.me?.name ?? '…',
      r: m.me?.rank ?? '—',
    });
  });
  protected say(c: Col<K>): string {
    return dt('dtColL', { p: c.name, t: pct(c.t), n: c.rank });
  }
}
