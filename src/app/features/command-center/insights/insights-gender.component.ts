import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { GenView } from './insights.model';

@Component({
  selector: 'div.ix-gen',
  imports: [FmtPipe, GlyphComponent, PctPipe, TPipe],
  template: `@let v = view();
    <div class="ix-gsum">
      <div class="ix-gs m">
        <span class="ix-gg"><span mjGlyph="m"></span></span>
        <div class="ix-gt">
          <span class="mj-micro"
            >{{ 'male' | t }} · <span class="pk">{{ v.mPeak }}</span></span
          ><b class="mj-num">{{ v.m | fmt }}</b>
        </div>
      </div>
      <div class="ix-gmid">
        <div class="ix-gmeter">
          <i class="m" [style.flex-grow]="v.ms"></i><i class="f" [style.flex-grow]="100 - v.ms"></i>
        </div>
        <div class="ix-gpc">
          <span class="m mj-num">{{ v.ms | pct }}</span
          ><span class="mj-chip sm ix-gap">{{ v.gap }}</span
          ><span class="f mj-num">{{ 100 - v.ms | pct }}</span>
        </div>
      </div>
      <div class="ix-gs f">
        <div class="ix-gt">
          <span class="mj-micro"
            >{{ 'female' | t }} · <span class="pk">{{ v.fPeak }}</span></span
          ><b class="mj-num">{{ v.f | fmt }}</b>
        </div>
        <span class="ix-gg"><span mjGlyph="f"></span></span>
      </div>
    </div>
    <div class="ix-grows">
      @for (r of v.rows; track r.hour; let i = $index) {
        <div class="ix-gr" [attr.data-i]="i" [style.--i]="i">
          <div class="ix-gb m" [class.pk]="r.mPeak">
            <span class="v mj-num">{{ r.m | fmt }}</span
            ><i [style.width]="r.mw"></i>
          </div>
          <span class="ix-gh mj-num">{{ r.hour }}</span>
          <div class="ix-gb f" [class.pk]="r.fPeak">
            <i [style.width]="r.fw"></i><span class="v mj-num">{{ r.f | fmt }}</span>
          </div>
        </div>
      }
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsGenderComponent {
  readonly view = input.required<GenView>();
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => {
      const rows = this.host.querySelector('.ix-grows')!;
      rows.addEventListener('pointermove', (e) => {
        const r = (e.target as Element).closest('.ix-gr');
        rows.querySelectorAll('.ix-gr').forEach((x) => x.classList.toggle('hv', x === r));
      });
      rows.addEventListener('pointerleave', () =>
        rows.querySelectorAll('.ix-gr.hv').forEach((x) => x.classList.remove('hv')),
      );
    });
  }
}
