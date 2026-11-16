import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { WWil } from '../../../domain/winners/winners';
import { WinnersMemo } from '../winners-memo';
import { GovCard, matchWils } from '../winners.model';
import { WfIconComponent } from './wf-icon.component';
import { WfTPipe } from './wf-t.pipe';

@Component({
  selector: 'div[wfWils]',
  imports: [WfIconComponent, WfTPipe],
  host: { class: 'wf-wils' },
  template: `<label class="wf-gsel">
      <span class="wf-gsel-k">{{ 'wnGovLabel' | wfT }}</span>
      <span class="wf-gsel-v"><b>{{ card().name }}</b><svg wfIcon="down"></svg></span>
      <select [attr.aria-label]="'wnPickTitle' | wfT" (change)="pickGov.emit(value($event))">
        @for (g of govs(); track g.id) {<option [value]="g.id" [selected]="g.id === card().id">{{ g.name || g.n }}</option>}
      </select>
    </label>
    <div class="wf-tally" [class.full]="full()" [attr.data-fig]="'win.' + card().id + '.tally'">
      <b>{{ tally().done }}<small>/{{ tally().all }}</small></b><span>{{ (full() ? 'wnAllDone' : 'wnAnnouncedOf') | wfT }}</span>
      <i class="wf-tally-bar" aria-hidden="true" [style.--w]="tally().all ? tally().done / tally().all : 0"></i>
    </div>
    <label class="wf-find" [class.typed]="!!q()">
      <svg wfIcon="search"></svg>
      <input type="search" inputmode="search" enterkeyhint="search" autocomplete="off" [placeholder]="'wnSearch' | wfT" [attr.aria-label]="'wnSearch' | wfT" [value]="q()" (input)="q.set(value($event))" (keydown.escape)="clear($event)">
      @if (q()) {<button type="button" class="wf-clear" [attr.aria-label]="'wfClear' | wfT" (click)="q.set('')"><svg wfIcon="close"></svg></button>}
    </label>
    <ol class="wf-rows">
      @for (w of wils(); track w.id; let i = $index) {
        @if (shows(i)) {
          <li>
            <button type="button" class="wf-wil" [class.on]="i === cur()" [class.done]="w.published" [attr.aria-current]="i === cur() ? 'true' : null" (click)="choose.emit(i)">
              <span class="wf-wil-dot" aria-hidden="true">@if (w.published) {<svg wfIcon="check"></svg>} @else {<i></i>}</span>
              <span class="wf-wil-t"><b>{{ w.name }}</b><small>@if (w.seats) {{{ 'wnSeats' | wfT: { n: w.seats } }} · }{{ (w.published ? 'wnDeclared' : 'wnPendingShort') | wfT }}</small></span>
              @if (w.published) {<span class="wf-faces" aria-hidden="true">@for (c of w.winners; track c.id) {@if (c.thumb) {<img [src]="c.thumb" alt="" width="32" height="32" decoding="async" loading="lazy">} @else {<span>{{ c.ini }}</span>}}</span>}
              <svg class="wf-go" wfIcon="go"></svg>
            </button>
          </li>
        }
      }
    </ol>
    @if (wils().length && !matches().length) {<p class="wf-none" role="status">{{ 'wnNoMatch' | wfT }}</p>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WfWilsComponent {
  readonly card = input.required<GovCard>();
  readonly govs = input.required<GovCard[]>();
  readonly wils = input.required<readonly WWil[]>();
  readonly cur = input(0);
  readonly tally = input.required<{ done: number; all: number }>();
  readonly choose = output<number>();
  readonly pickGov = output<string>();

  private readonly memo = inject(WinnersMemo);
  protected readonly q = signal(this.memo.q);
  protected readonly matches = computed(() =>
    matchWils(
      this.wils().map((w) => w.name),
      this.q(),
    ),
  );
  private readonly hits = computed(() => new Set(this.matches()));
  protected readonly full = computed(
    () => this.tally().all > 0 && this.tally().done === this.tally().all,
  );

  constructor() {
    effect(() => (this.memo.q = this.q()));
  }

  protected shows(i: number): boolean {
    return this.hits().has(i);
  }
  protected value(e: Event): string {
    return (e.target as HTMLInputElement | HTMLSelectElement).value;
  }
  protected clear(e: Event): void {
    if (!this.q()) return;
    e.preventDefault();
    e.stopPropagation();
    this.q.set('');
  }
}
