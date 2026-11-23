import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { timeLeft } from '../../../domain/interim/interim';
import { IconComponent } from '../../../shared/ui/icon.component';
import { InterimCue } from './interim-cue.state';
import { CUE_GOVS, CueGov } from './interim-govs';
import { irT } from './interim-strings';

@Component({
  selector: 'div[ccInterim]',
  imports: [IconComponent],
  templateUrl: './interim-cue.component.html',
  styleUrls: ['./interim-base.scss', './interim-cue.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ir ir-tk',
    '[class.open]': "cue.cue() === 'open'",
  },
})
export class InterimCueComponent {
  readonly cue = inject(InterimCue);
  private readonly screen = inject(ScreenState);
  readonly govs = CUE_GOVS;
  readonly s = {
    kick: irT('irKick'),
    tag: irT('irTag'),
    ends: irT('irEnds'),
    pick: irT('irPick'),
    nav: irT('irNav'),
  };

  readonly left = computed(() => {
    const l = this.cue.cue() === 'open' ? this.cue.left() : null;
    return l === null ? null : timeLeft(l);
  });
  readonly goL = (g: CueGov): string => irT('irGo', { g: g.name });

  open(g: CueGov): void {
    this.screen.setRegion(g.id);
    this.screen.show('tv');
  }
}
