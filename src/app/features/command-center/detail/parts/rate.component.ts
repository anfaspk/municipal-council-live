import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { pct } from '../../../../domain/format';
import { VillageAgeRow } from '../../../../domain/stats/age';
import { DASH } from '../charts/chart';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { RateRow, rateModel } from './age.model';

@Component({
  selector: 'div.dt-rate',
  imports: [DtTPipe],
  template: `@let m = model();
<ol class="dt-rate-rows" [style.--ref]="m.ref ?? 0" [class.ref]="m.ref !== null">
  @for (r of m.rows; track r.band) {
    <li class="dt-rate-row" [class.hi]="r.hi" [class.lo]="r.lo" [style.--j]="$index" [attr.aria-label]="say(r)">
      <span class="dt-rate-b mj-num" aria-hidden="true">{{ r.label }}</span>
      <span class="dt-rate-bars" aria-hidden="true">
        <span class="dt-rate-line m"><span class="dt-rate-tr"><i [style.--k]="r.kM"></i></span><em class="mj-num">{{ p(r.tM) }}</em></span>
        <span class="dt-rate-line f"><span class="dt-rate-tr"><i [style.--k]="r.kF"></i></span><em class="mj-num">{{ p(r.tF) }}</em></span>
      </span>
      <b class="dt-rate-t mj-num" aria-hidden="true">{{ p(r.t) }}@if (r.hi) {<small>{{ 'dtRateHi' | dtT }}</small>} @else if (r.lo) {<small>{{ 'dtRateLo' | dtT }}</small>}</b>
    </li>
  }
</ol>
<div class="dt-rate-key" aria-hidden="true"><span><i class="dt-sw m"></i>{{ 'dtMen' | dtT }}</span><span><i class="dt-sw f"></i>{{ 'dtWomen' | dtT }}</span>@if (ref() !== null) {<span class="ref"><i class="dt-rate-refk"></i>{{ 'dtRef.vil' | dtT: { t: p(ref()) } }}</span>}</div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RateComponent {
  readonly rows = input.required<readonly VillageAgeRow[]>();
  readonly ref = input<number | null>(null);
  protected readonly model = computed(() => rateModel(this.rows(), this.ref()));
  protected readonly p = (t: number | null) => (t === null ? DASH : pct(t));
  protected say(r: RateRow): string {
    return dt('dtRateRow', { b: r.label, t: this.p(r.t), m: this.p(r.tM), f: this.p(r.tF) });
  }
}
