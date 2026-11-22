import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { fmt, pct } from '../../../../domain/format';
import type { Village } from '../../../../domain/stats/stats';
import { colsModel } from '../../detail/parts/cols.model';
import { FpTPipe } from './fp-t.pipe';
import { fp, fpParts } from './page-strings';

@Component({
  selector: 'div[flPgCols]',
  imports: [FpTPipe],
  host: { class: 'fl-pg-chart' },
  template: `@if (model().me; as me) {<p class="fl-say">@for (x of say(); track $index) {@if (x.bold) {<b>{{ x.text }}</b>} @else {{{ x.text }}}}</p>}
    <div class="fl-pg-vcols" role="group" [attr.aria-label]="'flPgColsL' | fpT: { w: wname() }">@for (c of cols(); track c.id) {<button type="button" class="fl-pg-vcol" [class]="c.band" [class.me]="c.me" [attr.aria-current]="c.me ? 'true' : null" [attr.aria-label]="c.label" (click)="c.me || pick.emit(c.id)"><i [style.--k]="c.k" aria-hidden="true"></i></button>}</div>
    <p class="fl-foot">{{ 'flPgColsHint' | fpT }}</p>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageColsComponent {
  readonly villages = input.required<readonly Village[]>();
  readonly current = input.required<number>();
  readonly wname = input.required<string>();
  readonly wturnout = input<number | null>(null);
  readonly pick = output<number>();
  protected readonly model = computed(() =>
    colsModel(
      this.villages().map((v) => ({ id: v.id, name: v.ar, t: v.t })),
      this.current(),
      this.wturnout(),
    ),
  );
  protected readonly cols = computed(() =>
    this.model().cols.map((c) => ({
      ...c,
      label: fp('flPgColL', { p: c.name, t: pct(c.t), r: c.rank }),
    })),
  );
  protected readonly say = computed(() => {
    const me = this.model().me!;
    return fpParts(
      'flPgCmpSay',
      { p: me.name, r: me.rank, n: fmt(this.villages().length), w: this.wname() },
      ['p', 'r'],
    );
  });

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    afterNextRender(() => {
      const row = host.querySelector<HTMLElement>('.fl-pg-vcols'),
        me = row?.querySelector<HTMLElement>('.me');
      if (!row || !me || row.scrollWidth <= row.clientWidth) return;
      const a = row.getBoundingClientRect(),
        b = me.getBoundingClientRect();
      row.scrollBy({ left: b.left + b.width / 2 - (a.left + a.width / 2) });
    });
  }
}
