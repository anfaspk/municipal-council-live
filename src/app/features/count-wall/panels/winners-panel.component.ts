import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CWil, countRace, seedOf } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { fmt, pct } from '../../../domain/format';
import { rng } from '../../../shared/ui/ornament';
import { CountAvatar, CountStar } from './panel-parts';
import { shareText } from './governorate-panel.component';
@Component({
  selector: 'div[countWinnersPanel]',
  templateUrl: './winners-panel.component.html',
  imports: [CountAvatar, CountStar],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersPanel {
  readonly wilayat = input.required<CWil>();
  protected readonly race = computed(() => countRace(this.wilayat()));
  protected readonly share = shareText;
  protected readonly particles = computed(() => {
    const random = rng(seedOf('fx/' + this.wilayat().n));
    return Array.from({ length: 26 }, (_, id) => ({
      id,
      x: ((random() - 0.5) * 760).toFixed(1) + 'px',
      y: (-40 - random() * 300).toFixed(1) + 'px',
      delay: (random() * 0.9).toFixed(2) + 's',
      scale: (0.5 + random()).toFixed(2),
    }));
  });
  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly percent = pct;
  protected readonly decimal = (n: number) => n.toFixed(1);
}
