import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';

@Component({
  selector: 'div.dw-k',
  imports: [CountUpDirective],
  // prettier-ignore
  template: `<span class="mj-micro">@if (live()) {<i class="dw-live"></i>}{{ label() }}</span>
    @let v = value();
    @if (v === null) {
      <b class="mj-num">–</b>
    } @else {
      <b class="mj-num" [mjCountUp]="v" [countDuration]="1000" [countGroup]="group()"></b>
    }
    <span class="sub">{{ sub() }}</span>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerKpiComponent {
  readonly label = input.required<string>();
  readonly value = input.required<number | null>();
  readonly sub = input.required<string>();
  readonly live = input(false);
  readonly group = input.required<string>();
}
