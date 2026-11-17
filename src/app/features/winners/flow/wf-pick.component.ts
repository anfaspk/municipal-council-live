import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { GEO } from '../../../domain/geo/geo.data';
import { GovCard } from '../winners.model';
import { WfIconComponent } from './wf-icon.component';
import { WfTPipe } from './wf-t.pipe';

@Component({
  selector: 'section[wfPick]',
  imports: [WfIconComponent, WfTPipe],
  host: { class: 'wf-pick' },
  template: `<p class="wf-kicker" aria-hidden="true"><i></i>{{ 'wnPickKicker' | wfT }}<i></i></p>
    <h2 class="wf-h1 wf-name" tabindex="-1">{{ 'wnPickHead' | wfT }}</h2>
    <p class="wf-lead">{{ 'wnPickLead' | wfT }}</p>
    @if (wait()) {<p class="wf-note"><svg wfIcon="box"></svg><span>{{ 'wnWait' | wfT }}</span></p>}
    @if (map()) {
      <div class="wf-omap" dir="ltr" role="img" [attr.aria-label]="'wfMapL' | wfT"><svg [attr.viewBox]="box" aria-hidden="true">
        @for (g of shapes(); track g.id) {<path [class]="g.st" [attr.d]="g.d" [style.--p]="g.p"/>}
        @for (g of shapes(); track g.id) {<text [attr.x]="g.x" [attr.y]="g.y">{{ g.name }}</text>}
      </svg></div>
    }
    <ul class="wf-govs">
      @for (c of cards(); track c.id) {
        @let s = sum(c);
        <li>
          <button type="button" class="wf-gov" [class.full]="!!s && s.done === s.all" [attr.data-g]="c.id" (click)="pick.emit(c.id)">
            <span class="wf-gov-n" aria-hidden="true">{{ two(c.n) }}</span>
            <span class="wf-gov-t"><b>{{ c.name }}</b>@if (c.wils) {<small>{{ 'wilCount' | wfT: { n: c.wils } }}</small>}</span>
            @if (!wait()) {
              @if (s) {
                <span class="wf-gov-p" [attr.data-fig]="'win.gov.' + c.id"><i [style.--p]="s.done / s.all" aria-hidden="true"></i><em>@if (s.done === s.all) {<svg wfIcon="check"></svg>}{{ 'wnAnnounced' | wfT: { done: s.done, all: s.all } }}</em></span>
              } @else {
                <span class="wf-gov-p none"><em>{{ 'wfNotOpen' | wfT }}</em></span>
              }
            }
          </button>
        </li>
      }
    </ul>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WfPickComponent {
  readonly cards = input.required<GovCard[]>();
  readonly sums = input<ReadonlyMap<number, { done: number; all: number }>>(new Map());
  readonly wait = input(false);
  readonly pick = output<string>();
  readonly map = input(false);
  protected readonly box = '0 0 ' + GEO.w + ' ' + GEO.h;
  protected readonly shapes = computed(() =>
    this.cards().flatMap((c) => {
      const g = GEO.g[c.id];
      if (!g) return [];
      const s = this.sum(c);
      return [
        {
          id: c.id,
          d: g.d,
          x: g.c[0],
          y: g.c[1],
          name: c.name,
          p: s ? s.done / s.all : 0,
          st: !s ? 'none' : s.done === s.all ? 'full' : 'part',
        },
      ];
    }),
  );

  protected two(n: number): string {
    return String(n).padStart(2, '0');
  }
  protected sum(c: GovCard): { done: number; all: number } | null {
    const s = this.sums().get(c.apiId);
    return s && s.all ? s : null;
  }
}
