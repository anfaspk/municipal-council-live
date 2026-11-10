import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { TPipe } from '../../../shared/ui/t.pipe';

@Component({
  selector: 'div.dw-gen',
  imports: [FmtPipe, PctPipe, TPipe],
  template: `<div class="lbls">
      <span class="m-t"
        >{{ 'male' | t }} <b class="mj-num">{{ m() | fmt }}</b></span
      >
      <span class="mj-micro">{{ 'votesCast' | t }}</span>
      <span class="f-t"
        ><b class="mj-num">{{ f() | fmt }}</b> {{ 'female' | t }}</span
      >
    </div>
    <div class="bars">
      <div class="half m">
        <i class="bar m" [style.width]="(share() * 100).toFixed(1) + '%'"></i>
      </div>
      <span class="axis"></span>
      <div class="half">
        <i class="bar f" [style.width]="(100 - share() * 100).toFixed(1) + '%'"></i>
      </div>
    </div>
    <div class="dw-gl mj-num">
      <span>{{ share() * 100 | pct }}</span
      ><span>{{ 100 - share() * 100 | pct }}</span>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerGenderComponent {
  readonly m = input.required<number>();
  readonly f = input.required<number>();
  protected readonly share = computed(() => {
    const m = this.m(),
      f = this.f();
    return m + f ? m / (m + f) : 0.5;
  });
}
