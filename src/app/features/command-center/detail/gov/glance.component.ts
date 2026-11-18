import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { fmt, pct } from '../../../../domain/format';
import { band, BANDS } from '../../../../domain/stats/turnout';
import { ChartDirective } from '../charts/chart-tip';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { Glance } from './gov.model';
@Component({
  selector: 'div.dt-glance',
  imports: [ChartDirective, DtTPipe],
  template: `@let m = model();
<div class="dt-gn-bar" [dtChart]="summary()" [dtTips]="tips()" #c="dtChart">
  @for (s of m.strip.segs; track s.band; let i = $index) {
    <span class="dt-gn-seg" [class]="s.band" [class.on]="c.active() === i" [attr.data-i]="i" [style.--x]="s.x" [style.--w]="s.w"><b class="mj-num">{{ s.n }}</b></span>
  }
</div>
<ul class="dt-gn-key" aria-hidden="true">
  @for (b of bands; track b) {<li><i class="mj-sw" [class]="b"></i>{{ 'dtZone.' + b | dtT }}</li>}
</ul>
<div class="dt-gn-facts">
  @if (m.top; as x) {
    <button type="button" class="dt-gn-fact" [class]="bandOf(x.t)" (click)="pick.emit(x.id)"><span class="dt-gn-k">{{ 'dtBest' | dtT }}</span><b class="dt-gn-n">{{ x.name }}</b><span class="dt-gn-v mj-num">{{ pct(x.t) }}</span></button>
  }
  @if (m.low; as x) {
    <button type="button" class="dt-gn-fact" [class]="bandOf(x.t)" (click)="pick.emit(x.id)"><span class="dt-gn-k">{{ 'dtWorst' | dtT }}</span><b class="dt-gn-n">{{ x.name }}</b><span class="dt-gn-v mj-num">{{ pct(x.t) }}</span></button>
  }
  @if (m.peak; as p) {
    <div class="dt-gn-fact peak"><span class="dt-gn-k">{{ 'dtPeakH' | dtT }}</span><b class="dt-gn-n mj-num">{{ p.h }}</b><span class="dt-gn-v">{{ 'dtVotesN' | dtT: { n: fmt(p.v) } }}</span></div>
  }
</div>`,
  host: { '[class.dt-gn-empty]': '!model().strip.total' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlanceComponent {
  readonly model = input.required<Glance>();
  readonly pick = output<number>();
  protected readonly bands = BANDS;
  protected readonly pct = pct;
  protected readonly fmt = fmt;
  protected readonly bandOf = band;
  protected readonly tips = computed(() =>
    this.model().strip.segs.map((s) => dt('dtTipStripW', { b: dt('dtBand.' + s.band), n: s.n })),
  );
  protected readonly summary = computed(() => {
    const s = this.model().strip,
      c = s.counts;
    return dt('dtSumStripW', { n: s.total, l: c.low, m: c.mid, h: c.high });
  });
}
