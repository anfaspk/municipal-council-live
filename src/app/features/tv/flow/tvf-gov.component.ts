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
import { TvView } from '../tv.view';
import { sayParts } from './tvf-national.component';
import { TvfIconComponent } from './tvf-icon.component';
import { TvfMoreComponent } from './tvf-more.component';
import { TvfRegionComponent } from './tvf-region.component';
import { TvfRingComponent } from './tvf-ring.component';
import { tvf } from './tvf-strings';
import { TvfTabsComponent } from './tvf-tabs.component';
import { TvfTPipe } from './tvf-t.pipe';

@Component({
  selector: 'section[tvfGov]',
  imports: [
    PctPipe,
    TvfIconComponent,
    TvfMoreComponent,
    TvfRegionComponent,
    TvfRingComponent,
    TvfTabsComponent,
    TvfTPipe,
  ],
  host: { class: 'tvf-story tvf-gov' },
  template: `@if (view.gov(); as g) {
    @if (view.inter()) {<div tvfTabs></div>} @else {
      <p class="tvf-kick">{{ 'tvfGovKick' | tvfT: { n: g.wilCount } }}</p>
      <div class="tvf-namerow"><h1 class="tvf-h1 big">{{ g.name }}</h1><span class="tvf-chips"><span class="tvf-chip">{{ 'tvfRankOf' | tvfT: { r: g.rank, n: g.govCount } }}</span><span class="tvf-chip band" [class]="g.band"><i></i>{{ 'tvfBand-' + g.band | tvfT }}</span></span></div>
    }
    <div class="tvf-pair">
      <div tvfRing [class]="g.band" [t]="g.turnout" [label]="ringL" [fig]="'tv.gov.' + g.key + '.turnout'"></div>
      <div tvfRegion [pick]="view.inter()" (picked)="picked.emit($event)"></div>
    </div>
    <p class="tvf-say">@for (p of say(); track $index) {@if (p.fig) {<b [attr.data-fig]="p.fig">{{ p.text }}</b>} @else {{{ p.text }}}}</p>
    @if (view.cmp(); as c) {<p class="tvf-cmp" [class.up]="c.up"><svg [tvfIcon]="c.up ? 'up' : 'down'"></svg>{{ c.key | tvfT: { p: c.p } }}</p>}
    <div class="tvf-aside">
    @if (view.top().length) {
      <ol class="tvf-list">
        @for (w of view.top(); track w.id) {
          <li class="tvf-row" [class]="w.band" [class.lit]="view.lit() === w.i"><span class="tvf-rank">{{ w.rank }}</span><span class="tvf-row-m"><b>{{ w.name }}</b><span class="tvf-bar"><i [style.--k]="w.t / 100"></i></span></span><span class="tvf-row-e"><b class="tvf-ink" [attr.data-fig]="'tv.wil.' + w.id + '.turnout'">{{ w.t | pct }}</b><small>{{ votes(w.voted) }}</small></span></li>
        }
      </ol>
      @if (!view.wide()) {<button type="button" class="tvf-all" (click)="all.emit()">{{ 'tvfAllWil' | tvfT: { n: g.wilayat.length } }}<svg tvfIcon="up"></svg></button>}
    } @else {<p class="tvf-wait"><i></i>{{ 'tvfWaitWils' | tvfT }}</p>}
    </div>
    @if (view.wide() && !view.inter()) {<div class="tvf-p2"><div tvfMore [gender]="g.gender"></div></div>}
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfGovComponent {
  protected readonly view = inject(TvView);
  readonly all = output<void>();
  readonly picked = output<number>();
  protected readonly ringL = tvf('tvfTurnout');
  protected readonly say = computed(() => {
    const g = this.view.gov();
    return g ? sayParts(g.voted, g.reg, 'tv.gov.' + g.key) : [];
  });
  protected votes(n: number): string {
    return tvf('tvfVotes', { n: fmt(n) });
  }
}
