import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { PctPipe } from '../../../shared/ui/format.pipes';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';
import { Gender } from '../tv-slide.model';

@Component({
  selector: 'div[appTvGender]',
  imports: [CountUpDirective, GlyphComponent, PctPipe, TPipe],
  template: `
    @let g = gender();
    <div class="tv-ch"><span class="mj-micro">{{ 'gender' | t }} · {{ 'votesCast' | t }}</span></div>
    <div class="tv-gv">
      <div class="gm">
        <span class="glyph m"><span mjGlyph="m"></span></span>
        <div><b class="mj-num" [mjCountUp]="g.votedM" [countDuration]="1800" countGroup="show"></b><span>{{ 'male' | t }} · {{ g.turnoutM | pct }} {{ 'turnoutWord' | t }}</span></div>
      </div>
      <div class="gf">
        <div><b class="mj-num" [mjCountUp]="g.votedF" [countDuration]="1800" countGroup="show"></b><span>{{ 'female' | t }} · {{ g.turnoutF | pct }} {{ 'turnoutWord' | t }}</span></div>
        <span class="glyph f"><span mjGlyph="f"></span></span>
      </div>
    </div>
    <div class="tv-gbar" dir="ltr"><i class="m" [style.--w]="g.widthM"></i><i class="f" [style.--w]="g.widthF"></i></div>
    <div class="tv-gl" dir="ltr"><span>{{ g.shareM | pct }}</span><span>{{ 100 - g.shareM | pct }}</span></div>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvGenderComponent {
  readonly gender = input.required<Gender>();
}
