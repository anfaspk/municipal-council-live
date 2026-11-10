import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { CEvent } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { name } from '../../../domain/format';
import { CountAvatar, CountStar } from './panel-parts';
@Component({
  selector: 'div.ctv-banner',
  template: `<span class="k"><svg countStar></svg>{{ text('cJust') }}</span
    ><b>{{ event().w.n }}</b
    ><span class="g">{{ name(event().gov) }}</span
    ><span class="w">
      <!-- prettier-ignore -->
      @for (candidate of event().winners; track candidate.id) {@if (!$first) {<s></s>}<i [countAvatar]="candidate"></i>{{ candidate.ar }}}
    </span>`,
  imports: [CountAvatar, CountStar],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountBanner {
  readonly event = input.required<CEvent>();
  protected readonly text = ct;
  protected readonly name = name;
}
