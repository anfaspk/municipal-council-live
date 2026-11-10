import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { FmtPipe } from '../../../shared/ui/format.pipes';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';

@Component({
  selector: 'div[appTvStats]',
  imports: [CountUpDirective, FmtPipe, TPipe],
  template: `
    <div class="ts voted"><span class="tv-ts-l"><i class="hs-live"></i>{{ 'votesCast' | t }}</span><b class="mj-num" [mjCountUp]="voted()" [countDuration]="1800" countGroup="show"></b></div>
    <div class="ts reg"><span class="tv-ts-l"><i class="hs-dot"></i>{{ 'registered' | t }}</span><b class="mj-num">{{ reg() | fmt }}</b></div>
    <div class="ts yet"><span class="tv-ts-l"><i class="hs-live"></i>{{ 'yetToVote' | t }}</span><b class="mj-num" [mjCountUp]="reg() - voted()" [countDuration]="1800" countGroup="show"></b></div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvStatsComponent {
  readonly voted = input.required<number>();
  readonly reg = input.required<number>();
}
