import {
  ChangeDetectionStrategy,
  Component,
  input,
  viewChildren,
  ViewEncapsulation,
} from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { IconComponent } from '../../../shared/ui/icon.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { WilView } from './insights.model';

@Component({
  selector: 'div.ix-wil',
  imports: [CountUpDirective, FmtPipe, IconComponent, PctPipe, TPipe],
  template: `@let v = view();
    <div class="ix-wref">
      <span class="mj-micro">{{ 'sTurnout' | t }} · {{ 'votesOfReg' | t }}</span
      ><span class="ix-wkl"
        ><i></i><span>{{ v.refLabel }}</span></span
      >
    </div>
    <ol class="ix-wl">
      @for (r of v.rows; track r?.id ?? ('empty-' + $index); let i = $index) {
        <li
          class="ix-wr"
          [class]="r?.band ?? ''"
          [class.top]="i === 0"
          [style.--i]="i"
          [style.display]="r ? null : 'none'"
          [attr.aria-label]="r ? r.name + ', ' + r.sub + ': ' + (r.t | pct) : null"
        >
          <span class="ix-rk">
            @if (i === 0) {
              <svg [mjIcon]="'crown'"></svg>
            }
            <b>{{ i + 1 }}</b></span
          >
          <div class="ix-wn">
            <bdi>{{ r?.name }}</bdi>
          </div>
          <div class="ix-wt">
            <i class="ix-wf" [style.width]="r ? min(100, r.t).toFixed(2) + '%' : null"></i
            ><i class="ix-wk" [style.inset-inline-start]="v.ref.toFixed(2) + '%'"></i>
          </div>
          <div class="ix-wv">
            <span class="ix-wp"
              ><i class="mj-sw" [class]="r?.band ?? ''" [title]="r ? (r.band | t) : ''"></i
              ><b
                class="mj-num"
                [mjCountUp]="r?.t ?? 0"
                [countFormat]="'pct'"
                [countDuration]="1200"
              ></b></span
            ><span class="ix-wc mj-num">
              @if (r) {
                <ng-container>{{ r.voted | fmt }} / {{ r.reg | fmt }}</ng-container>
              }
            </span>
          </div>
        </li>
      }
    </ol>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsWilayatComponent {
  readonly view = input.required<WilView>();
  protected readonly min = Math.min;
  private readonly counts = viewChildren(CountUpDirective);

  countUp(): void {
    this.counts().forEach((c, k) => setTimeout(() => c.play(), 380 + k * 70));
  }
}
