import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { ct } from '../../../core/i18n/count-strings';
import { CGov, CWil, countRace } from '../../../domain/count/count';
import { STATUS_LABEL } from '../stage/stage-markup';
import { CountStats, CountStatus } from './panel-parts';

@Component({
  selector: 'div.cx-whw',
  templateUrl: './wilayat-head.component.html',
  imports: [CountStats, CountStatus],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WilayatHead {
  readonly revision = input(0);
  readonly governorate = input.required<CGov>();
  readonly wilayat = input.required<CWil>();
  protected readonly text = ct;
  protected readonly race = computed(() => countRace(this.wilayat()));
  protected readonly status = computed(() => STATUS_LABEL[this.wilayat().st]);
  protected readonly ring = computed(() => {
    const w = this.wilayat(),
      p = w.st === 'await' ? 0 : w.st === 'count' ? this.race().p : 100,
      circumference = 2 * Math.PI * 34;
    return {
      value: Math.round(p),
      dash: ((circumference * p) / 100).toFixed(2) + ' ' + circumference.toFixed(2),
    };
  });
}
