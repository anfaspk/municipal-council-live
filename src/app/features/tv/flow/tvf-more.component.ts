import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../data/turnout.store';
import { pct } from '../../../domain/format';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import type { Gender } from '../tv-slide.model';
import { hoursSpark } from './tv-flow.model';
import { TvfTPipe } from './tvf-t.pipe';

@Component({
  selector: 'div[tvfMore]',
  imports: [FmtPipe, PctPipe, GlyphComponent, TvfTPipe],
  host: { class: 'tvf-gm' },
  template: `@let g = gender();
    <p class="tvf-micro">{{ 'tvfGender' | tvfT }}</p>
    <div class="tvf-gnd">
      <div class="tvf-gs m"><span mjGlyph="m"></span><div><span>{{ 'male' | tvfT }}</span><b>{{ g.votedM | fmt }}</b><small>{{ 'tvfTurnoutOf' | tvfT: { p: pc(g.turnoutM) } }}</small></div></div>
      <div class="tvf-gs f"><span mjGlyph="f"></span><div><span>{{ 'female' | tvfT }}</span><b>{{ g.votedF | fmt }}</b><small>{{ 'tvfTurnoutOf' | tvfT: { p: pc(g.turnoutF) } }}</small></div></div>
    </div>
    <div class="tvf-gbar" [style.--m]="g.shareM / 100"><i class="m"></i><i class="f"></i></div>
    <p class="tvf-gl"><span>{{ 'tvfShareOf' | tvfT: { p: pc(g.shareM) } }}</span><span>{{ 100 - g.shareM | pct }}</span></p>
    @if (hours() && spark(); as s) {
      <div class="tvf-hrs"><p class="tvf-micro gap">{{ 'tvfHours' | tvfT }}</p>
      <div class="tvf-spark" dir="ltr"><svg viewBox="0 0 340 64" preserveAspectRatio="none" aria-hidden="true"><path class="area" [attr.d]="s.area"/><path class="ln" [attr.d]="s.d"/></svg><p><span>{{ s.from }}</span><span>{{ 'tvfNow' | tvfT }}</span></p></div></div>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfMoreComponent {
  private readonly stats = inject(TurnoutStore);
  readonly gender = input.required<Gender>();
  readonly hours = input(false);
  protected readonly spark = computed(() => hoursSpark(this.stats.national().hours));
  protected readonly pc = pct;
}
