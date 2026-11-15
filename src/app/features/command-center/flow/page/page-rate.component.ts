import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { pct } from '../../../../domain/format';
import { GlyphComponent } from '../../../../shared/ui/glyph.component';
import { TPipe } from '../../../../shared/ui/t.pipe';
import type { Rate } from '../../detail/parts/age.model';
import { FpTPipe } from './fp-t.pipe';
import { fp, fpParts } from './page-strings';

const DASH = '—';

@Component({
  selector: 'div[flPgRate]',
  imports: [GlyphComponent, TPipe, FpTPipe],
  host: { class: 'fl-pg-chart' },
  template: `@let r = rate();
    @if (r.hi && r.lo) {<p class="fl-say">@for (x of say(); track $index) {@if (x.bold) {<b dir="ltr">{{ x.text }}</b>} @else {{{ x.text }}}}</p>} @else {<p class="fl-say small">{{ 'flPgRate0' | fpT }}</p>}
    <div class="fl-pg-bfh" aria-hidden="true"><span><span class="fl-sex m" mjGlyph="m"></span>{{ 'male' | t }}</span>@if (refText(); as t) {<em>{{ t }}</em>}<span>{{ 'female' | t }}<span class="fl-sex f" mjGlyph="f"></span></span></div>
    <ul class="fl-pg-rate">@for (x of rows(); track x.band) {<li [class.hi]="x.hi" [class.lo]="x.lo" [attr.aria-label]="x.label"><em dir="ltr" aria-hidden="true">{{ x.name }}</em>
      <span class="fl-track m" [class.ref]="r.ref !== null" [style.--ref]="r.ref" aria-hidden="true"><span class="fl-fill" [style.--k]="x.kM"></span></span><small aria-hidden="true">{{ x.m }}</small>
      <span class="fl-track f" [class.ref]="r.ref !== null" [style.--ref]="r.ref" aria-hidden="true"><span class="fl-fill" [style.--k]="x.kF"></span></span><small aria-hidden="true">{{ x.f }}</small></li>}</ul>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageRateComponent {
  readonly rate = input.required<Rate>();
  readonly turnout = input<number | null>(null);
  protected readonly rows = computed(() =>
    this.rate().rows.map((x) => {
      const m = x.tM === null ? DASH : pct(x.tM),
        f = x.tF === null ? DASH : pct(x.tF);
      return { ...x, name: x.label, m, f, label: fp('flPgRateRow', { b: x.label, m, f }) };
    }),
  );
  protected readonly refText = computed(() => {
    const t = this.turnout();
    return t === null || this.rate().ref === null ? null : fp('flPgRateRef', { t: pct(t) });
  });
  protected readonly say = computed(() => {
    const r = this.rate();
    return fpParts('flPgRateSay', { hi: r.hi?.label ?? '', lo: r.lo?.label ?? '' }, ['hi', 'lo']);
  });
}
