import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { PctPipe } from '../../../shared/ui/format.pipes';
import { RING_R, ringDash } from './tv-flow.model';

@Component({
  selector: 'div[tvfRing]',
  imports: [PctPipe],
  host: { class: 'tvf-ring' },
  template: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" [attr.r]="r"/><circle class="arc" cx="50" cy="50" [attr.r]="r" [attr.stroke-dasharray]="dash()" transform="rotate(-90 50 50)"/></svg>
    <div class="tvf-ring-in"><b class="tvf-big" [attr.data-fig]="fig()">{{ t() | pct }}</b><small>{{ label() }}</small></div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfRingComponent {
  readonly t = input.required<number>();
  readonly label = input.required<string>();
  readonly fig = input.required<string>();
  protected readonly r = RING_R;
  protected readonly dash = computed(() => ringDash(this.t()));
}
