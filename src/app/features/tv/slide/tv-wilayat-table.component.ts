import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { FmtPipe } from '../../../shared/ui/format.pipes';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';
import { WilayatStat } from '../tv-geometry';
import { TvSlideState } from './tv-slide-state';

@Component({
  selector: 'div[appTvWilayatTable]',
  imports: [CountUpDirective, FmtPipe, TPipe],
  host: { '[class.two]': 'rows().length > 3' },
  template: `
    <div class="tv-ch"><span class="mj-micro">{{ 'byWil' | t }} · {{ 'votesOfReg' | t }}</span></div>
    <div class="tv-wrs" [style.--rows]="perColumn()">
      @for (r of rows(); track r.id) {
        <div class="tv-wr" [class]="r.band" [class.hi]="spot() === r.i" [style.--j]="r.i">
          <span class="r mj-num">{{ r.rank }}</span>
          <span class="nm">{{ r.name }}</span>
          <b class="pc mj-num" [mjCountUp]="r.t" countFormat="pct" [countDuration]="1400" countGroup="table"></b>
          <span class="ct mj-num" dir="ltr"><em [mjCountUp]="r.voted" [countDuration]="1400" countGroup="table"></em> / {{ r.reg | fmt }}</span>
        </div>
      }
    </div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvWilayatTableComponent {
  readonly rows = input.required<WilayatStat[]>();
  protected readonly spot = inject(TvSlideState).spot;
  protected readonly perColumn = computed(() => {
    const n = this.rows().length;
    return n > 3 ? Math.ceil(n / 2) : n;
  });
}
