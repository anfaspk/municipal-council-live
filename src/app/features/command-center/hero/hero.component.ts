import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../data/turnout.store';
import { fmt, pct, pctOf } from '../../../domain/format';
import { BootFlag } from '../../../shared/motion/boot';
import { IncenseDirective } from '../../../shared/motion/incense.directive';
import { OdometerComponent } from '../../../shared/motion/odometer.component';
import { GaugeComponent } from '../../../shared/ui/gauge.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { BallotComponent } from './ballot/ballot.component';

@Component({
  selector: 'section.cc-hero',
  imports: [BallotComponent, GaugeComponent, IncenseDirective, OdometerComponent, TPipe],
  templateUrl: './hero.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeroComponent {
  protected readonly stats = inject(TurnoutStore);
  protected readonly fmt = fmt;
  protected readonly pct = pct;
  protected readonly pctOf = pctOf;
  protected readonly regKnown = computed(
    () => !this.stats.national().unread.includes('registered'),
  );
  protected readonly introMs = inject(BootFlag).first ? 2200 : 0;
}
