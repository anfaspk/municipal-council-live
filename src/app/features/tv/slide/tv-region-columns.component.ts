import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { RegionColumns } from '../tv-geometry';
import { TvSlideState } from './tv-slide-state';
import { BANDS } from '../../../domain/stats/turnout';

@Component({
  selector: 'svg[appTvRegionColumns]',
  imports: [CountUpDirective],
  host: {
    '[attr.viewBox]': 'columns().viewBox',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
  },
  templateUrl: './tv-region-columns.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvRegionColumnsComponent {
  readonly columns = input.required<RegionColumns>();
  protected readonly spot = inject(TvSlideState).spot;
  protected readonly bands = BANDS;

  protected ref(b: string): string {
    return this.columns().id + '-' + b;
  }
  protected url(b: string): string {
    return 'url(#' + this.ref(b) + ')';
  }
  protected color(b: string): string {
    return 'var(--band-' + b + ')';
  }
}
