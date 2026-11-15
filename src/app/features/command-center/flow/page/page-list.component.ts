import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { fmt, pct } from '../../../../domain/format';
import type { RankRow } from '../../detail/charts/ranked.model';
import { FlIconComponent } from '../fl-icon.component';

import { fp } from './page-strings';

@Component({
  selector: 'ol[flPgList]',
  imports: [FlIconComponent],
  host: { class: 'fl-list fl-pg-list' },
  template: `@for (r of view(); track r.id) {<li><button type="button" class="fl-row" (click)="pick.emit(r.id)">
      <span class="fl-rank" [class]="r.band">{{ r.rank }}</span>
      <span class="fl-row-main"><b>{{ r.name }}</b><span class="fl-track" [class.ref]="tick() !== null" [style.--ref]="tick()" aria-hidden="true"><span class="fl-fill" [class]="r.band" [style.--k]="r.k"></span></span></span>
      <span class="fl-row-end"><b class="fl-ink" [class]="r.band">{{ r.pct }}</b><small>{{ r.votes }}</small></span>
      <svg class="fl-go" flIcon="back"></svg></button></li>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageListComponent {
  readonly rows = input.required<readonly RankRow<number>[]>();
  readonly tick = input<number | null>(null);
  readonly pick = output<number>();
  protected readonly view = computed(() =>
    this.rows().map((r) => {
      return { ...r, pct: pct(r.t), votes: fp('flVoteN', { n: fmt(r.voted) }) };
    }),
  );
}
