import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { IconComponent } from '../../../shared/ui/icon.component';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { DrawToss } from './draw-toss';
import { TieItem } from './draw.model';

@Component({
  selector: 'section[cxdStage]',
  templateUrl: './draw-stage.component.html',
  imports: [IconComponent, RaceAvatarComponent],
  host: {
    class: 'cxd-stage',
    '[attr.aria-label]': "text('cxTossL', { w: item().name })",
    '[class.spin]': "phase() === 'spin'",
    '[class.end]': "phase() === 'end'",
    '[class.drawn]': "item().state === 'drawn'",
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawStageComponent extends DrawToss {
  readonly item = input.required<TieItem>({ alias: 'cxdStage' });
  readonly still = input(false);
  readonly play = input(0);
  readonly hold = input(false);
  readonly active = input(true);
  readonly ask = output();
}
