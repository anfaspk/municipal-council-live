import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { IconComponent } from '../../../shared/ui/icon.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { replayAges } from './insights-dom';
import { AgeView } from './insights.model';

@Component({
  selector: 'div.ix-age',
  imports: [GlyphComponent, IconComponent, TPipe],
  styleUrls: ['./insights-ages.scss', './insights-ages-build.scss'],
  template: `@let v = view();
    <div class="ix-ahd">
      <p class="ix-apill" [class.on]="v.top >= 0">
        @if (v.top >= 0) {
          <svg [mjIcon]="'crown'"></svg>
        }
        <span>{{ v.head }}</span>
      </p>
      <ul class="ix-aleg" aria-hidden="true">
        <li class="m"><span mjGlyph="m"></span>{{ 'male' | t }}</li>
        <li class="f"><span mjGlyph="f"></span>{{ 'female' | t }}</li>
      </ul>
    </div>
    <div class="ix-achart" [class.empty]="!v.ticks.length" [style.--top]="v.top">
      <div class="ix-aplot">
        <div class="ix-agrid" aria-hidden="true">
          @for (j of lines; track j) {
            <i [style.--j]="j"></i>
          }
        </div>
        <div class="ix-aspot" [class.on]="v.top >= 0" aria-hidden="true"><i></i></div>
        <ol class="ix-acols" [attr.aria-label]="'ixAgeT' | t">
          @for (c of v.cols; track c.label; let i = $index) {
            <li class="ix-ag" [class.top]="c.top" [style.--i]="i" [attr.aria-label]="c.aria">
              <div class="ix-ac m" [style.--k]="c.km" aria-hidden="true">
                <span class="ix-atrk"><i class="ix-abar"></i></span
                ><span class="ix-alift"><b class="mj-num">{{ c.m }}</b></span>
              </div>
              <div class="ix-ac f" [style.--k]="c.kf" aria-hidden="true">
                <span class="ix-atrk"><i class="ix-abar"></i></span
                ><span class="ix-alift"><b class="mj-num">{{ c.f }}</b></span>
              </div>
            </li>
          }
        </ol>
      </div>
      <div class="ix-aaxis" aria-hidden="true">
        @for (tk of v.ticks; track $index) {
          <span class="mj-num" [style.--j]="$index">{{ tk }}</span>
        }
      </div>
      <div class="ix-axs" aria-hidden="true">
        @for (c of v.cols; track c.label; let i = $index) {
          <span class="mj-num" [class.top]="c.top" [style.--i]="i">{{ c.label }}</span>
        }
      </div>
      <div class="ix-ashare" aria-hidden="true">
        @for (c of v.cols; track c.label; let i = $index) {
          <span class="ix-acell" [class.top]="c.top" [style.--i]="i" [style.--s]="c.ks"
            ><b class="mj-num">{{ c.share }}</b><i></i
          ></span>
        }
      </div>
      <span class="ix-ashh" aria-hidden="true">{{ 'ixAgeShare' | t }}</span>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsAgesComponent {
  readonly view = input.required<AgeView>();

  protected readonly lines = [0, 1, 2, 3, 4];
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => {
      replayAges(this.host);
      const cols = this.host.querySelector('.ix-acols')!;
      cols.addEventListener('pointermove', (e) => {
        const g = (e.target as Element).closest('.ix-ag');
        this.host.classList.toggle('ix-ahv', !!g);
        cols.querySelectorAll('.ix-ag').forEach((x) => x.classList.toggle('hv', x === g));
      });
      cols.addEventListener('pointerleave', () => {
        this.host.classList.remove('ix-ahv');
        cols.querySelectorAll('.ix-ag.hv').forEach((x) => x.classList.remove('hv'));
      });
    });
  }
}
