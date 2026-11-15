import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../../domain/format';
import type { Age } from '../../../../domain/stats/age';
import { GlyphComponent } from '../../../../shared/ui/glyph.component';
import { TPipe } from '../../../../shared/ui/t.pipe';
import { ageBarsModel } from '../../detail/parts/age.model';
import { FpTPipe } from './fp-t.pipe';
import { fp, fpParts } from './page-strings';

const DASH = '—';

@Component({
  selector: 'div[flPgAges]',
  imports: [GlyphComponent, TPipe, FpTPipe],
  host: { class: 'fl-pg-chart' },
  template: `@if (model().top) {<p class="fl-say">@for (x of say(); track $index) {@if (x.bold) {<b>{{ x.text }}</b>} @else {{{ x.text }}}}</p>} @else {<p class="fl-say small">{{ 'flPgAges0' | fpT }}</p>}
    <div class="fl-pg-bfh" aria-hidden="true"><span><span class="fl-sex m" mjGlyph="m"></span>{{ 'male' | t }}</span><span>{{ 'female' | t }}<span class="fl-sex f" mjGlyph="f"></span></span></div>
    <ul class="fl-pg-bf">@for (r of rows(); track r.band) {<li [class.top]="r.top" [attr.aria-label]="r.label"><span class="m" aria-hidden="true"><small>{{ r.m }}</small><i [style.--k]="r.km"></i></span><em aria-hidden="true"><b dir="ltr">{{ r.name }}</b><small>{{ r.share }}</small></em><span class="f" aria-hidden="true"><i [style.--k]="r.kf"></i><small>{{ r.f }}</small></span></li>}</ul>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageAgesComponent {
  readonly ages = input.required<Age | null>();
  protected readonly model = computed(() => ageBarsModel(this.ages()));
  private readonly max = computed(() =>
    Math.max(1, ...this.model().rows.flatMap((r) => [r.m ?? 0, r.f ?? 0])),
  );
  protected readonly rows = computed(() =>
    this.model().rows.map((r) => {
      const m = r.m === null ? DASH : fmt(r.m),
        f = r.f === null ? DASH : fmt(r.f),
        share = r.share ?? DASH;
      return {
        band: r.band,
        name: r.label,
        top: r.top,
        km: (r.m ?? 0) / this.max(),
        kf: (r.f ?? 0) / this.max(),
        m,
        f,
        share,
        label: fp('flPgAgeRow', { b: r.label, m, f, p: share }),
      };
    }),
  );
  protected readonly say = computed(() => {
    const t = this.model().top!;
    return fpParts('flPgAgeTop', { b: t.label, p: t.share }, ['b', 'p']);
  });
}
