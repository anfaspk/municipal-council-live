import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { SharePipe, FmtPipe } from '../../../shared/ui/format.pipes';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { RaceView, restGrid } from '../../../shared/ui/race-board.model';
import { CfIconComponent } from './cf-icon.component';
import { CfTPipe } from './cf-t.pipe';

@Component({
  selector: 'div[cfBoard]',
  imports: [CfIconComponent, CfTPipe, FmtPipe, SharePipe, RaceAvatarComponent],
  host: { class: 'cf-board', '[style.--cols]': 'grid().cols' },
  template: `@let r = race();
    @if (holders().length) {
      <div class="cf-seats">
        @for (c of holders(); track c.id) {
          <article class="cf-seat" [class.one]="r.seats === 1" [attr.data-id]="c.id">
            <span class="cf-av lg" mjRaceAv [cand]="c"></span>
            <div class="cf-who"><span class="cf-badge"><svg cfIcon="crown"></svg>{{ 'cfSeatN' | cfT: { n: c.seat } }}@if (drawWins().includes(c.id)) {<em class="cf-drawn">{{ 'cfDrawnTag' | cfT }}</em>}</span><b class="cf-nm">{{ c.name }}</b></div>
            <div class="cf-vp"><b class="mj-num">{{ c.v | fmt }}</b>@if (c.share !== null) {<span class="mj-num"><bdi>{{ c.share | share }}</bdi></span>}</div>
          </article>
        }
      </div>
    }
    @if (level().length) {
      <div class="cf-level">
        @for (c of level(); track c.id) {
          <article class="cf-up" [attr.data-id]="c.id">
            <span class="cf-av md" mjRaceAv [cand]="c"></span>
            <span class="cf-badge"><svg cfIcon="star"></svg>{{ 'cfLevel' | cfT: { n: c.seat } }}</span>
            <b class="cf-nm">{{ c.name }}</b>
            <div class="cf-vp sm"><b class="mj-num">{{ c.v | fmt }}</b>@if (c.share !== null) {<span class="mj-num"><bdi>{{ c.share | share }}</bdi></span>}</div>
          </article>
        }
      </div>
    }
    @if (r.next; as nx) {
      @if (r.seats === 1 && holders().length === 1) {
        <article class="cf-seat one cf-duel" [attr.data-id]="nx.id">
          <span class="cf-av lg" mjRaceAv [cand]="nx"></span>
          <div class="cf-who"><span class="cf-badge">{{ 'cfNext' | cfT }}</span><b class="cf-nm">{{ nx.name }}</b><span class="cf-need mj-num">{{ 'cfNeed' | cfT: { n: (nx.need | fmt) } }}</span></div>
          <div class="cf-vp"><b class="mj-num">{{ nx.v | fmt }}</b>@if (nx.share !== null) {<span class="mj-num"><bdi>{{ nx.share | share }}</bdi></span>}</div>
        </article>
      } @else {
        <p class="cf-line"><i aria-hidden="true"></i>{{ 'cfLine' | cfT: { n: (nx.need | fmt), s: r.seats } }}</p>
        <p class="cf-micro">{{ 'cfNext' | cfT }}</p>
        <ol class="cf-cands"><li class="cf-cr" [attr.data-id]="nx.id"><span class="cf-pos mj-num">{{ nx.rank }}</span><span class="cf-av sm" mjRaceAv [cand]="nx"></span><span class="cf-cr-m"><b class="cf-nm">{{ nx.name }}</b><span class="cf-cbar" aria-hidden="true"><i [style.--k]="nx.w"></i></span></span><span class="cf-vp sm"><b class="mj-num">{{ nx.v | fmt }}</b>@if (nx.share !== null) {<span class="mj-num"><bdi>{{ nx.share | share }}</bdi></span>}</span></li></ol>
      }
    }
    @if (r.rest.length || nota() !== null) {
      <p class="cf-micro">{{ (holders().length || level().length ? 'cfRest' : 'cfAll') | cfT: { a: r.restFrom, b: r.restTo } }}</p>
      <ol class="cf-cands cf-rest">
        @for (c of r.rest; track c.id) {
          <li class="cf-cr" [attr.data-id]="c.id"><span class="cf-pos mj-num">{{ c.rank }}</span><span class="cf-av sm" mjRaceAv [cand]="c"></span><span class="cf-cr-m"><b class="cf-nm">{{ c.name }}</b><span class="cf-cbar" aria-hidden="true"><i [style.--k]="c.w"></i></span></span><span class="cf-vp sm"><b class="mj-num">{{ c.v | fmt }}</b>@if (c.share !== null) {<span class="mj-num"><bdi>{{ c.share | share }}</bdi></span>}</span></li>
        }
        @if (nota(); as n) {
          <li class="cf-cr other"><span class="cf-pos"></span><span class="cf-av sm none" aria-hidden="true"></span><span class="cf-cr-m"><b class="cf-nm">{{ 'cxNota' | cfT }}</b></span><span class="cf-vp sm"><b class="mj-num">{{ n.v | fmt }}</b>@if (n.p !== null) {<span class="mj-num"><bdi>{{ n.p | share }}</bdi></span>}</span></li>
        }
      </ol>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfBoardComponent {
  readonly race = input.required<RaceView>({ alias: 'cfBoard' });
  readonly tied = input<ReadonlySet<string>>(new Set());
  readonly drawWins = input<readonly string[]>([]);
  readonly nota = input<{ v: number; p: number | null } | null>(null);
  protected readonly holders = computed(() =>
    this.race().seatCards.filter((c) => !this.tied().has(c.id)),
  );
  protected readonly level = computed(() =>
    this.race().seatCards.filter((c) => this.tied().has(c.id)),
  );
  protected readonly grid = computed(() => restGrid(this.race().rest.length, 1));
}
