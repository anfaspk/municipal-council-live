import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { PctPipe } from '../../../shared/ui/format.pipes';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';
import { CountryMap } from '../tv-geometry';

@Component({
  selector: 'svg[appTvCountryMap]',
  imports: [PctPipe, TPipe],
  host: {
    '[attr.viewBox]': 'map().viewBox',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
  },
  templateUrl: './tv-country-map.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvCountryMapComponent {
  readonly map = input.required<CountryMap>();
  readonly dots = input<ReadonlyMap<number, string> | null>(null);
}
