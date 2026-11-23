import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../domain/format';
import { PctPipe } from '../../../shared/ui/format.pipes';
import { GlyphComponent } from '../../../shared/ui/glyph.component';
import { TvView } from '../tv.view';
import { TvfIconComponent } from './tvf-icon.component';
import { TvfMoreComponent } from './tvf-more.component';
import { TvfRingComponent } from './tvf-ring.component';
import { tvf, tvfParts } from './tvf-strings';
import { TvfTPipe } from './tvf-t.pipe';

@Component({
  selector: 'section[tvfNat]',
  imports: [
    PctPipe,
    GlyphComponent,
    TvfIconComponent,
    TvfMoreComponent,
    TvfRingComponent,
    TvfTPipe,
  ],
  host: { class: 'tvf-story tvf-nat' },
  template: `@if (view.nat(); as n) {
    <p class="tvf-kick">{{ 'national' | tvfT }}</p>
    <h1 class="tvf-h1">{{ 'natTurnout' | tvfT }}</h1>
    <div class="tvf-hero">
      <div tvfRing [class]="n.band" [t]="n.turnout" [label]="ringL" fig="tv.nat.turnout"></div>
      <div class="tvf-hero-t">
        <p class="tvf-say">@for (p of say(); track $index) {@if (p.fig) {<b [attr.data-fig]="p.fig">{{ p.text }}</b>} @else {{{ p.text }}}}</p>
        <span class="tvf-chip band" [class]="n.band"><i></i>{{ 'tvfBand-' + n.band | tvfT }}</span>
        <p class="tvf-yet">{{ 'tvfYet' | tvfT: { n: yet() } }}</p>
      </div>
    </div>
    @if (view.country(); as c) {
      <div class="tvf-natmap">
        <div class="tvf-mapbox" dir="ltr" role="img" [attr.aria-label]="'tvfMapL' | tvfT">
          <svg class="tvf-map" [attr.viewBox]="c.viewBox" aria-hidden="true">
            <path class="ol" [attr.d]="c.outline"/>
            @for (r of c.regions; track r.id) {<path [class]="r.band" [attr.d]="r.d"/>}
          </svg>
          @for (m of c.marks; track $index) {<span class="tvf-mark" aria-hidden="true" [style.--x]="m.x" [style.--y]="m.y">{{ m.rank }}</span>}
        </div>
        <div class="tvf-side">
          @if (view.wide()) {
            <p class="tvf-micro">{{ 'tvfRanking' | tvfT }}</p>
            <ol class="tvf-list tvf-rank-all" [attr.aria-label]="'tvfRanking' | tvfT">
              @for (r of view.ranking(); track r.id) {<li class="tvf-row" [class]="r.band"><span class="tvf-rank">{{ r.rank }}</span><span class="tvf-row-m"><b>{{ r.name }}</b><span class="tvf-bar"><i [style.--k]="r.t / 100"></i></span></span><span class="tvf-row-e"><b class="tvf-ink" [attr.data-fig]="$index < 3 ? 'tv.lead.' + $index : null">{{ r.t | pct }}</b><small>{{ votes(r.voted) }}</small></span></li>}
            </ol>
          } @else {
            <p class="tvf-micro">{{ 'tvfTop' | tvfT }}</p>
            <ol class="tvf-top">
              @for (l of n.leaders; track $index) {<li [class]="l.band"><span class="tvf-rank">{{ l.rank }}</span><b class="nm">{{ l.name }}</b><b class="tvf-ink" [attr.data-fig]="'tv.lead.' + $index">{{ l.t | pct }}</b></li>}
            </ol>
          }
          <div class="tvf-legend">@for (b of bands; track b) {<span class="tvf-chip band" [class]="b"><i></i>{{ 'tvfBand-' + b | tvfT }}</span>}</div>
        </div>
      </div>
    }
    @if (view.wide()) {<div class="tvf-p2"><div tvfMore [gender]="n.gender" [hours]="true"></div></div>} @else {
      <button type="button" class="tvf-more" (click)="more.emit()"><span mjGlyph="m" class="m"></span><span mjGlyph="f" class="f"></span>{{ 'tvfMore' | tvfT }}<svg tvfIcon="up"></svg></button>
    }
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfNationalComponent {
  protected readonly view = inject(TvView);
  readonly more = output<void>();
  protected readonly ringL = tvf('tvfTurnout');
  protected readonly bands = ['low', 'mid', 'high'] as const;
  protected votes(n: number): string {
    return tvf('tvfVotes', { n: fmt(n) });
  }
  protected readonly yet = computed(() => {
    const n = this.view.nat();
    return n ? fmt(n.reg - n.voted) : '';
  });
  protected readonly say = computed(() => {
    const n = this.view.nat();
    return n ? sayParts(n.voted, n.reg, 'tv.nat') : [];
  });
}

export function sayParts(
  voted: number,
  reg: number,
  fig: string,
): { text: string; fig: string | null }[] {
  const figs = [fig + '.voted', fig + '.registered'];
  let k = 0;
  return tvfParts('tvfSay', { v: fmt(voted), r: fmt(reg) }, ['v', 'r']).map((p) => ({
    text: p.text,
    fig: p.bold ? (figs[k++] ?? null) : null,
  }));
}
