import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../../domain/format';
import { GlyphComponent } from '../../../../shared/ui/glyph.component';
import { TPipe } from '../../../../shared/ui/t.pipe';
import type { Gender } from '../../detail/parts/place.model';
import { FpTPipe } from './fp-t.pipe';
import { fp, fpParts } from './page-strings';

import { genderSay } from './page.model';

@Component({
  selector: 'div[flPgGender]',
  imports: [GlyphComponent, TPipe, FpTPipe],
  host: { class: 'fl-pg-chart' },
  template: `@let g = gender();
    @if (say(); as s) {<p class="fl-say">@for (x of s; track $index) {@if (x.bold) {<b>{{ x.text }}</b>} @else {{{ x.text }}}}</p>}
    <div class="fl-ps-row">@for (s of sexes(); track s.sex) {<div class="fl-ps" [class]="s.sex"><span class="fl-sex" [mjGlyph]="s.sex"></span><span>{{ s.sex === 'm' ? ('male' | t) : ('female' | t) }}</span><b class="mj-num">{{ s.t }}</b><small>{{ s.of }}</small></div>@if (s.sex === 'm') {<span></span>}}</div>
    @if (g.km !== null) {<div class="fl-split"><div class="fl-split-l"><b>{{ g.m }}</b><em>{{ 'flPgOfVoters' | fpT }}</em><b>{{ g.f }}</b></div><div class="fl-split-bar" aria-hidden="true"><i class="m" [style.--k]="g.km"></i><i class="f" [style.--k]="1 - g.km"></i></div></div>}
    @else {<p class="fl-say small">{{ 'flPgGen0' | fpT }}</p>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageGenderComponent {
  readonly gender = input.required<Gender>();
  protected readonly sexes = computed(() =>
    (['m', 'f'] as const).map((sex) => {
      const r = this.gender().rate[sex];
      return {
        sex,
        t: r.txt ?? '—',
        of: fp('flPgOfN', { v: fmt(r.voted), r: r.reg > 0 ? fmt(r.reg) : '—' }),
      };
    }),
  );
  protected readonly say = computed(() => {
    const s = genderSay(this.gender());
    return s ? fpParts(s.key, { n: s.n }, ['n']) : null;
  });
}
