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
import { Col, ColPlace, colsModel } from './cols.model';

@Component({
  selector: 'div.dt-cols',
  imports: [DtTPipe],
  template: `@let m = model();
<div class="dt-cols-plot" [style.--ref]="m.ref ?? 0" [class.ref]="m.ref !== null" [style.--at]="m.at ?? 0">
  @if (m.me; as me) {
    <p class="dt-cols-me" aria-hidden="true"><b>{{ me.name }}</b><span class="mj-num">{{ pct(me.t) }} · {{ 'dtPlaceMe' | dtT: { n: me.rank, m: m.cols.length } }}</span></p>
  }
  <div class="dt-cols-area">
  <ol class="dt-cols-row" [attr.aria-label]="summary()">
    @for (c of m.cols; track c.id) {
      <li>
        @if (c.me) {
          <span class="dt-vcol me" role="img" [class]="c.band" [attr.aria-label]="say(c)" aria-current="true"><i [style.--k]="c.k"></i></span>
        } @else {
          <button type="button" class="dt-vcol" [class]="c.band" [attr.aria-label]="say(c)" [title]="say(c)" (click)="pick.emit(c.id)"><i [style.--k]="c.k"></i></button>
        }
      </li>
    }
  </ol>
  @if (m.ref !== null) {<span class="dt-cols-ref" aria-hidden="true"><em class="mj-num">{{ 'dtRef.wil' | dtT: { t: pct(ref()!) } }}</em></span>}
  </div>
</div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColsComponent<K = number> {
  readonly places = input.required<readonly ColPlace<K>[]>();
  readonly current = input.required<K>();
  readonly ref = input<number | null>(null);
  readonly pick = output<K>();
  protected readonly pct = pct;
  protected readonly model = computed(() => colsModel(this.places(), this.current(), this.ref()));
  protected readonly summary = computed(() => {
    const m = this.model();
    return dt('dtSumCols', {
      n: m.cols.length,
      p: m.me?.name ?? '…',
      r: m.me?.rank ?? '—',
    });
  });
  protected say(c: Col<K>): string {
    return dt('dtColL', { p: c.name, t: pct(c.t), n: c.rank });
  }
}
