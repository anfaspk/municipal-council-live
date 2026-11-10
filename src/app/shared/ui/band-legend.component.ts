import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { Gov } from '../../domain/stats/stats';
import { Band, band, turnout } from '../../domain/stats/turnout';
import { TPipe } from './t.pipe';

@Component({
  selector: '.map-bands',
  imports: [TPipe],
  templateUrl: './band-legend.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandLegendComponent {
  readonly govs = input.required<readonly Gov[]>();
  protected readonly bands: Band[] = ['high', 'mid', 'low'];
  protected readonly count = computed(() => {
    const cnt = { low: 0, mid: 0, high: 0 };
    this.govs().forEach((g) => {
      cnt[band(turnout(g))]++;
    });
    return cnt;
  });
}
