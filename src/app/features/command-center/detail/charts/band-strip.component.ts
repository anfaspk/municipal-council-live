import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { pct } from '../../../../domain/format';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { ChartDirective } from './chart-tip';
import { bandStripModel, StripPlace } from './band-strip.model';

@Component({
  selector: 'div.dt-strip',
  imports: [ChartDirective, DtTPipe],
  template: `@let m = model();
<div class="dt-strip-bar" [dtChart]="summary()" [dtTips]="tips()" #c="dtChart">
  @for (s of m.segs; track s.band; let i = $index) {
    <span class="dt-seg" [class]="s.band" [class.on]="c.active() === i" [attr.data-i]="i" [style.--x]="s.x" [style.--w]="s.w"><b class="mj-num">{{ s.n }}</b></span>
  }
</div>
<div class="dt-strip-lists">
  @for (l of lists(); track l.key) {
    @if (l.places.length) {
      <section class="dt-strip-list" [class]="l.key">
        <h4 class="dt-sub">{{ l.title | dtT }}</h4>
        <ol>
          @for (x of l.places; track x.id) {<li><button type="button" class="dt-mini" (click)="pick.emit(x.id)"><span>{{ x.name }}</span><b class="mj-num">{{ pct(x.t) }}</b></button></li>}
        </ol>
      </section>
    }
  }
</div>
<table class="mj-sr">
  <thead><tr><th scope="col">{{ 'dtTurnoutL' | dtT }}</th><th scope="col">{{ 'dtCountL' | dtT }}</th></tr></thead>
  <tbody>@for (b of bands; track b) {<tr><th scope="row">{{ 'dtBand.' + b | dtT }}</th><td>{{ m.counts[b] }}</td></tr>}</tbody>
</table>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandStripComponent<K = number> {
  readonly places = input.required<readonly StripPlace<K>[]>();
  readonly pick = output<K>();
  protected readonly bands = ['low', 'mid', 'high'] as const;
  protected readonly pct = pct;
  protected readonly model = computed(() => bandStripModel(this.places()));
  protected readonly lists = computed(() => [
    { key: 'best', title: 'dtBest', places: this.model().best },
    { key: 'worst', title: 'dtWorst', places: this.model().worst },
  ]);
  protected readonly tips = computed(() =>
    this.model().segs.map((s) => dt('dtTipStrip', { b: dt('dtBand.' + s.band), n: s.n })),
  );
  protected readonly summary = computed(() => {
    const c = this.model().counts;
    return dt('dtSumStrip', { n: this.model().total, l: c.low, m: c.mid, h: c.high });
  });
}
