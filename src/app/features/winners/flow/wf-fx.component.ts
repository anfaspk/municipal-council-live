import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { ViewportState } from '../../../core/screen/viewport.state';
import { WWil } from '../../../domain/winners/winners';
import { starfield } from '../winners.model';

const STARS = [starfield(96, 41, 0.7, 1000, 540, 1.3), starfield(30, 53, 1.4, 1000, 540, 1.6)];
const MOTES = [starfield(24, 61, 2.2, 600, 420, 0.7), starfield(16, 67, 3, 600, 420, 0.6)];

@Component({
  selector: 'div[wfFx]',
  host: { class: 'wf-fx', 'aria-hidden': 'true' },
  template: `@if (full()) {
      <div class="wf-fx-set"><div class="wf-fx-in">
        <div class="wf-fx-night">@for (s of stars; track $index) {<i class="wf-fx-stars" [style.--stars]="s" [style.--l]="$index"></i>}<i class="wf-fx-meteor"></i><i class="wf-fx-meteor m2"></i></div>
        <i class="wf-fx-glow"></i><i class="wf-fx-mist"></i><i class="wf-fx-lamps"></i>
      </div></div>
      @for (k of [key()]; track k) {
        <i class="wf-fx-sweep"></i>
        @if (wil()?.published) {<i class="wf-fx-burst"></i>@for (m of motes; track $index) {<i class="wf-fx-motes" [class.m2]="$index === 1" [style.--motes]="m"></i>}}
      }
    }`,
  styleUrls: ['./wf-fx.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WfFxComponent {
  readonly wil = input<WWil | null>(null);
  private readonly viewport = inject(ViewportState);
  protected readonly full = computed(() => this.viewport.fx() !== 'lite');
  protected readonly stars = STARS;
  protected readonly motes = MOTES;
  protected readonly key = computed(() => {
    const w = this.wil();
    return w ? w.id + (w.published ? ':d' : ':p') : '';
  });
}
