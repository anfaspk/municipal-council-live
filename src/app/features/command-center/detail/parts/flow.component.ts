import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { fmt } from '../../../../domain/format';
import { CountUpDirective } from '../../../../shared/motion/count-up.directive';
import { IconComponent, IconName } from '../../../../shared/ui/icon.component';
import { DASH, orDash } from '../charts/chart';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { FlowKey, FlowStep } from './place.model';

const ICON: Record<FlowKey, IconName> = {
  pop: 'people',
  reg: 'badge',
  voted: 'ballot',
  not: 'pause',
};

@Component({
  selector: 'div.dt-flow',
  imports: [CountUpDirective, DtTPipe, IconComponent],
  template: `<ol class="dt-steps">
  @for (s of steps(); track s.key) {
    <li class="dt-step" [class]="s.key" [attr.aria-label]="say(s)">
      <span class="dt-step-ic" aria-hidden="true"><svg [mjIcon]="icon[s.key]"></svg></span>
      <span class="dt-step-l">{{ 'dtFlow.' + s.key | dtT }}</span>
      @if (s.t !== null) {<b class="dt-step-n mj-num" [mjCountUp]="s.t"></b>} @else {<b class="dt-step-n mj-num">{{ dash }}</b>}
      <span class="dt-step-of mj-num">@if (s.of) {{{ 'dtFlowOf.' + s.key | dtT: { p: s.of } }}}</span>
      <span class="dt-step-bar" [class.none]="s.km === null" aria-hidden="true"><i class="m" [style.--k]="s.km ?? 0"></i><i class="f" [style.--k]="s.km === null ? 0 : 1 - s.km"></i></span>
      <span class="dt-step-mf mj-num" aria-hidden="true"><span class="m"><i class="dt-sw m"></i>{{ num(s.m) }}</span><span class="f"><i class="dt-sw f"></i>{{ num(s.f) }}</span></span>
    </li>
  }
</ol>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowComponent {
  readonly steps = input.required<readonly FlowStep[]>();
  protected readonly icon = ICON;
  protected readonly dash = DASH;
  protected readonly num = (n: number | null) => orDash(n, fmt);
  protected say(s: FlowStep): string {
    return dt('dtFlowL', {
      s: dt('dtFlow.' + s.key),
      n: this.num(s.t),
      m: this.num(s.m),
      f: this.num(s.f),
    });
  }
}
