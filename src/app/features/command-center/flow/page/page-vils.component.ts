import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import type { Village } from '../../../../domain/stats/stats';
import { type Band, BANDS } from '../../../../domain/stats/turnout';
import { rankedModel } from '../../detail/charts/ranked.model';
import { bandCounts, filterVillages, villageRows } from '../../detail/wil/villages.model';
import { FlIconComponent } from '../fl-icon.component';
import { FpTPipe } from './fp-t.pipe';
import { fp } from './page-strings';

import { lowFirst, type PageSort, VIL_SORTS } from './page.model';
import { PageListComponent } from './page-list.component';

@Component({
  selector: 'div[flPgVils]',
  imports: [FlIconComponent, FpTPipe, PageListComponent],
  host: { class: 'fl-pg-vils' },
  template: `<label class="fl-pg-q"><svg flIcon="search"></svg><input type="search" inputmode="search" enterkeyhint="search" autocomplete="off" spellcheck="false" aria-keyshortcuts="/" [value]="q()" [placeholder]="'flPgSearchP' | fpT" [attr.aria-label]="'flPgSearchL' | fpT" (input)="q.set($any($event.target).value)" (keydown.arrowdown)="down($event)" (keydown.enter)="$any($event.target).blur()"/>@if (q()) {<button type="button" class="fl-btn icon quiet" [attr.aria-label]="'flPgClear' | fpT" (click)="q.set('')"><svg flIcon="close"></svg></button>}</label>
    <div class="fl-sort" role="group" [attr.aria-label]="'flPgSortL' | fpT">@for (s of sorts; track s) {<button type="button" class="fl-chip" [class.on]="sort() === s" [attr.aria-pressed]="sort() === s" (click)="sort.set(s)">{{ 'flPgSort-' + s | fpT }}</button>}</div>
    <div class="fl-sort" role="group" [attr.aria-label]="'flPgBandsL' | fpT"><button type="button" class="fl-chip" [class.on]="!bands().length" [attr.aria-pressed]="!bands().length" [disabled]="villages() === undefined" (click)="bands.set([])">{{ 'flPgAll' | fpT: { n: all() } }}</button>@for (b of bandList; track b) {<button type="button" class="fl-chip band" [class]="b" [class.on]="bands().includes(b)" [attr.aria-pressed]="bands().includes(b)" [disabled]="villages() === undefined" (click)="toggle(b)"><i aria-hidden="true"></i><span class="mj-sr">{{ 'flBand-' + b | fpT }} </span>{{ counts()[b] }}</button>}</div>
    <p class="fl-say small" role="status">{{ villages() === undefined ? ('flPgLoading' | fpT) : status() }}</p>
    @if (villages() === undefined) {<div class="fl-skel-rows" aria-hidden="true">@for (i of skel; track i) {<i></i>}</div>}
    @else if (!villages()!.length) {<p class="fl-say small">{{ 'flPgNoVils' | fpT }}</p>}
    @else if (!rows().length) {<div class="fl-pg-empty"><p class="fl-say small">{{ 'flPgNoMatch' | fpT }}</p><button type="button" class="fl-btn" (click)="clear()">{{ 'flPgShowAll' | fpT }}</button></div>}
    @else {<ol flPgList [rows]="rows()" [tick]="tick()" (pick)="pick.emit($event)"></ol>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageVilsComponent {
  readonly villages = input.required<readonly Village[] | undefined>();
  readonly ref = input<number | null>(null);
  readonly pick = output<number>();
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly sorts = VIL_SORTS;
  protected readonly bandList = BANDS;
  protected readonly skel = [1, 2, 3, 4, 5];
  protected readonly q = signal('');
  protected readonly sort = signal<PageSort>('turnout');
  protected readonly bands = signal<readonly Band[]>([]);

  protected readonly all = computed(() => this.villages()?.length ?? 0);
  protected readonly counts = computed(() => bandCounts(this.villages() ?? []));
  private readonly shown = computed(() =>
    filterVillages(this.villages() ?? [], this.q(), this.bands()),
  );
  protected readonly rows = computed(() => {
    const s = this.sort(),
      m = rankedModel(villageRows(this.shown()), s === 'low' ? 'turnout' : s, this.ref());
    return s === 'low' ? lowFirst(m.rows) : m.rows;
  });
  protected readonly tick = computed(() => {
    const r = this.ref();
    return r === null ? null : Math.min(1, Math.max(0, r / 100));
  });
  protected readonly status = computed(() =>
    fp('flPgShown', { n: this.shown().length, m: this.all() }),
  );

  protected toggle(b: Band): void {
    this.bands.update((l) => (l.includes(b) ? l.filter((x) => x !== b) : [...l, b]));
  }
  protected clear(): void {
    this.q.set('');
    this.bands.set([]);
  }
  protected down(e: Event): void {
    const row = this.host.querySelector<HTMLElement>('.fl-row');
    if (!row) return;
    e.preventDefault();
    row.focus();
  }
}
