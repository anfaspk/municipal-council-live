import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../../domain/format';
import { Counts } from '../../../../domain/stats/stats';
import { DASH } from '../charts/chart';
import { DtTPipe } from '../dt-t.pipe';
import { genderModel } from './place.model';

@Component({
  selector: 'div.dt-gnd',
  imports: [DtTPipe],
  template: `@let g = model();
<div class="dt-gnd-share">
  <p class="dt-gnd-h">{{ 'dtGShare' | dtT }}</p>
  <div class="dt-gnd-who mj-num">
    <span class="m"><span class="dt-gnd-l"><i class="dt-sw m"></i>{{ 'dtMen' | dtT }}<small>{{ fmt(voted().m) }}</small></span><b>{{ g.m ?? dash }}</b></span>
    <span class="f"><span class="dt-gnd-l"><i class="dt-sw f"></i>{{ 'dtWomen' | dtT }}<small>{{ fmt(voted().f) }}</small></span><b>{{ g.f ?? dash }}</b></span>
  </div>
  <div class="dt-gnd-split" [class.none]="g.km === null" aria-hidden="true"><i class="m" [style.--k]="g.km ?? 0"></i><i class="f" [style.--k]="g.km === null ? 0 : 1 - g.km"></i><em class="dt-gnd-mid"></em></div>
  <p class="dt-gnd-gap" [class]="g.lead ?? 'level'">@if (g.gap !== null) {{{ 'dtGap.' + (g.lead ?? 'level') | dtT: { n: g.gap } }}}</p>
</div>
<div class="dt-gnd-rate">
  <p class="dt-gnd-h">{{ 'dtGRate' | dtT }}</p>
  @for (k of keys; track k) {
    @let r = g.rate[k];
    <div class="dt-gnd-row" [class]="k">
      <span class="dt-gnd-nm">{{ (k === 'm' ? 'dtMen' : 'dtWomen') | dtT }}</span>
      <span class="dt-gnd-track" aria-hidden="true"><i [style.--k]="r.k"></i></span>
      <b class="mj-num">{{ r.txt ?? dash }}</b>
      <small class="dt-gnd-of mj-num">{{ 'dtGRateOf' | dtT: { v: fmt(r.voted), r: fmt(r.reg) } }}</small>
    </div>
  }
</div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenderComponent {
  readonly reg = input.required<Counts>();
  readonly voted = input.required<Counts>();
  protected readonly keys = ['m', 'f'] as const;
  protected readonly fmt = fmt;
  protected readonly dash = DASH;
  protected readonly model = computed(() => genderModel(this.reg(), this.voted()));
}
