import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { pct } from '../../../../domain/format';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { DASH } from '../charts/chart';
import { DtTPipe } from '../dt-t.pipe';
import { Compare } from './place.model';

@Component({
  selector: 'div.dt-cmpb',
  imports: [DtTPipe, IconComponent],
  template: `@let m = model();
<div class="mj-panel-head dt-chd">
  <div class="mj-ph-l"><span class="mj-micro gold">{{ 'dtCmpT' | dtT: { p: name() } }}</span><span class="mj-panel-title dt-cs">{{ 'dtCmpS' | dtT }}</span></div>
</div>
<ul class="dt-cmp-rows">
  @for (r of m.rows; track r.key) {
    <li class="dt-cmp-row" [class]="r.key + ' ' + (r.band ?? '')">
      <span class="dt-cmp-nm">{{ r.label }}</span>
      <span class="dt-cmp-track" aria-hidden="true"><i class="dt-cmp-fill" [style.--k]="r.k"></i></span>
      <b class="dt-cmp-v mj-num">{{ r.t === null ? dash : pct(r.t) }}</b>
    </li>
  }
  <li class="dt-cmp-row dt-cmp-scale" aria-hidden="true">
    <span class="dt-cmp-nm"></span>
    <span class="dt-cmp-zones">
      <i class="z low"><em>{{ 'dtZone.low' | dtT }}</em></i><i class="z mid"><em>{{ 'dtZone.mid' | dtT }}</em></i><i class="z high"><em>{{ 'dtZone.high' | dtT }}</em></i>
      <b class="mj-num t50">50%</b><b class="mj-num t70">70%</b>
    </span>
    <span></span>
  </li>
</ul>
@if (m.side && m.against) {
  <p class="dt-cmp-diff" [class]="m.side"><svg [mjIcon]="'trend'"></svg><span>{{ 'dtDiff.' + m.side | dtT: { p: m.against, n: m.gap ?? '' } }}</span></p>
}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareComponent {
  readonly model = input.required<Compare>();
  readonly name = input.required<string>();
  protected readonly pct = pct;
  protected readonly dash = DASH;
}
