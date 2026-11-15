import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../../domain/format';
import type { Hour } from '../../../../domain/stats/stats';
import { FpTPipe } from './fp-t.pipe';
import { fp, fpParts } from './page-strings';

import { hoursView } from './page.model';

@Component({
  selector: 'div[flPgHours]',
  imports: [FpTPipe],
  host: { class: 'fl-pg-chart' },
  template: `@if (model().peak; as p) {
      <p class="fl-say">@for (x of say(); track $index) {@if (x.bold) {<b>{{ x.text }}</b>} @else {{{ x.text }}}}</p>
      <div class="fl-pg-cols" dir="ltr" role="group" data-keys [attr.aria-label]="'flPgHoursL' | fpT" (keydown)="key($event)">@for (c of cols(); track c.h) {<button type="button" class="fl-pg-col" [class.peak]="c.peak" [class.on]="c.h === on()" [attr.aria-pressed]="c.h === on()" [tabIndex]="c.h === on() ? 0 : -1" (click)="on.set(c.h)"><small aria-hidden="true">{{ c.h === on() ? c.v : '' }}</small><span class="bar" aria-hidden="true"><i [style.--k]="c.k"></i></span><em>{{ c.hh }}<span class="mj-sr">{{ c.rest }}</span></em></button>}</div>
    } @else {
      <p class="fl-say small">{{ 'flPgHours0' | fpT }}</p>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHoursComponent {
  readonly hours = input.required<readonly Hour[]>();
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly model = computed(() => hoursView(this.hours()));
  protected readonly on = linkedSignal(() => this.model().peak?.h ?? null);
  protected readonly cols = computed(() =>
    this.model().cols.map((c) => ({
      h: c.h,
      hh: c.label,
      k: c.k,
      peak: c.peak,
      v: fmt(c.v),
      rest: fp('flPgHourRest', { n: fmt(c.v) }),
    })),
  );
  protected readonly say = computed(() => {
    const p = this.model().peak!;
    return fpParts('flPgPeak', { h: p.time, n: fmt(p.v) }, ['h', 'n']);
  });

  protected key(e: KeyboardEvent): void {
    const cols = this.model().cols,
      i = cols.findIndex((c) => c.h === this.on()),
      to =
        e.key === 'ArrowRight'
          ? i + 1
          : e.key === 'ArrowLeft'
            ? i - 1
            : e.key === 'Home'
              ? 0
              : e.key === 'End'
                ? cols.length - 1
                : null;
    if (to === null || !cols[to]) return;
    e.preventDefault();
    this.on.set(cols[to].h);
    this.host.querySelectorAll<HTMLElement>('.fl-pg-col')[to]?.focus();
  }
}
