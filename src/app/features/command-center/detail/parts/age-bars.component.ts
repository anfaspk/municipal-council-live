import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../../domain/format';
import { Age } from '../../../../domain/stats/age';
import { DASH, orDash } from '../charts/chart';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { AgeBarRow, ageBarsModel } from './age.model';

@Component({
  selector: 'div.dt-ageb',
  imports: [DtTPipe],
  template: `@let m = model();
<div class="dt-ageb-head" aria-hidden="true"><span class="m"><i class="dt-sw m"></i>{{ 'dtMen' | dtT }}@if (m.total) {<b class="mj-num">{{ fmt(m.total.m) }}</b>}</span><span class="c">{{ 'dtAgeBandS' | dtT }}</span><span class="f"><i class="dt-sw f"></i>{{ 'dtWomen' | dtT }}@if (m.total) {<b class="mj-num">{{ fmt(m.total.f) }}</b>}</span><span class="s">{{ 'dtShareL' | dtT }}</span></div>
<ol class="dt-ageb-rows">
  @for (r of m.rows; track r.band) {
    <li class="dt-ageb-row" [class.top]="r.top" [style.--j]="$index" [attr.aria-label]="say(r)">
      <span class="dt-ageb-v m mj-num" aria-hidden="true">{{ num(r.m) }}</span>
      <span class="dt-ageb-bar m" aria-hidden="true"><i [style.--k]="r.km"></i></span>
      <span class="dt-ageb-b mj-num" aria-hidden="true">{{ r.label }}</span>
      <span class="dt-ageb-bar f" aria-hidden="true"><i [style.--k]="r.kf"></i></span>
      <span class="dt-ageb-v f mj-num" aria-hidden="true">{{ num(r.f) }}</span>
      <b class="dt-ageb-s mj-num" aria-hidden="true">{{ r.share ?? dash }}</b>
    </li>
  }
</ol>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgeBarsComponent {
  readonly ages = input.required<Age | null>();
  protected readonly model = computed(() => ageBarsModel(this.ages()));
  protected readonly fmt = fmt;
  protected readonly dash = DASH;
  protected readonly num = (n: number | null) => orDash(n, fmt);
  protected say(r: AgeBarRow): string {
    return dt('dtAgeRow', { b: r.label, m: this.num(r.m), f: this.num(r.f), p: r.share ?? DASH });
  }
}
