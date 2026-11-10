import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { TieStage } from '../../domain/conflict/conflict';
import { AcceptGlyphComponent } from './accept-glyph.component';
import { CaTPipe } from './ca-t.pipe';

const STEPS = ['caStep1', 'caStep2', 'caStep3', 'caStep4'];
const AT: Record<TieStage, number> = { prep: 0, ready: 0, notified: 1, resolving: 2, resolved: 4 };

@Component({
  selector: 'section.ca-steps[caSteps]',
  imports: [AcceptGlyphComponent, CaTPipe],
  host: { '[style.--p]': 'fill()' },
  template: `
    <h2 class="ca-sec-t">{{ 'caSteps' | caT }}</h2>
    <ol class="ca-steps-l">
      @for (s of steps; track s; let i = $index) {
        <li class="ca-step" [class.done]="i < at()" [class.on]="i === at()" [attr.aria-current]="i === at() ? 'step' : null">
          <i class="ca-dot">
            @if (i < at()) {
              <svg caGlyph="check"></svg>
            } @else {
              <b>{{ i + 1 }}</b>
            }
          </i>
          <span class="ca-step-l">{{ s | caT }}</span>
          @if (i === at()) {
            <small class="ca-step-n">{{ 'caStepNow' | caT }}</small>
          }
        </li>
      }
    </ol>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptStepsComponent {
  readonly stage = input.required<TieStage>();
  protected readonly steps = STEPS;
  protected readonly at = computed(() => AT[this.stage()]);
  protected readonly fill = computed(() => Math.min(1, this.at() / (STEPS.length - 1)));
}
