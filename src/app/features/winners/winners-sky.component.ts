import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { LatticeComponent } from '../../shared/ui/lattice.component';
import { starfield } from './winners.model';

const STARS = [starfield(150, 11, 0.6), starfield(70, 23, 1.1), starfield(26, 37, 1.7)];

@Component({
  selector: 'div.wn-sky[wnSky]',
  imports: [LatticeComponent],
  host: { 'aria-hidden': 'true', '[class.deep]': 'deep()' },
  templateUrl: './winners-sky.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersSkyComponent {
  readonly deep = input(false);
  protected readonly stars = STARS;
  protected readonly spokes = Array.from({ length: 16 }, (_, i) => i * 22.5);
}
