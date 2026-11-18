import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  output,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { fmt } from '../../../domain/format';
import { FmtPipe, SharePipe } from '../../../shared/ui/format.pipes';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { ListPager } from '../../../shared/motion/list-pager';
import { TvView } from '../tv.view';
import { TvWalk } from '../tv-walk';
import { TvfIconComponent } from './tvf-icon.component';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { TvfTabsComponent } from './tvf-tabs.component';
import { TvfTPipe } from './tvf-t.pipe';

@Component({
  selector: 'section[tvfRes]',
  imports: [FmtPipe, SharePipe, RaceAvatarComponent, TvfIconComponent, TvfTabsComponent, TvfTPipe],
  host: { class: 'tvf-story tvf-res' },
  template: `@if (view.results(); as g) {
    <div tvfTabs></div>
    <p class="tvf-sub">{{ 'intSub' | tvfT: { n: g.rows.length } }} · {{ 'intVotes' | tvfT: { n: num(g.votes) } }}@if (view.toAt(); as at) {&ngsp;· <span class="tvf-until">{{ 'intUntil' | tvfT: { t: at } }}</span>}</p>
    <div class="tvf-chips-row" #chips role="group" [attr.aria-label]="'tvfWils' | tvfT">
      @for (r of g.rows; track r.id) {<button type="button" class="tvf-wchip" [class.on]="lit() === r.i" [attr.aria-pressed]="lit() === r.i" [attr.data-w]="r.i" (click)="picked.emit(r.i)">{{ r.name }}</button>}
    </div>
    @if (view.featured(); as f) {
      <section class="tvf-card" [attr.aria-label]="f.name">
        <div class="tvf-wh"><svg tvfIcon="ballot"></svg><div><span class="tvf-micro">{{ 'intWil' | tvfT }}</span><b>{{ f.name }}</b></div>
          @if (f.wil; as w) {<span class="tvf-chip sm">{{ 'resSeatsN' | tvfT: { n: f.seats } }}</span><span class="tvf-chip sm">{{ 'resCands' | tvfT: { n: w.candCount } }}</span>}</div>
        @if (!f.wil) {<p class="tvf-wait"><i></i>{{ 'intWait' | tvfT }}</p>} @else {
          @if (f.leaders.length) {
            <div class="tvf-seats">
              @for (c of f.leaders; track c.id; let k = $index) {
                <article class="tvf-seat" [class.one]="f.seats < 2">
                  <span class="tvf-av" [class]="f.seats > 1 ? 'md' : 'lg'" mjRaceAv [cand]="c"></span>
                  <div class="tvf-who"><span class="tvf-badge"><svg tvfIcon="crown"></svg>{{ (f.seats > 1 ? (k < 2 ? 'resSeat' + (k + 1) : 'resSeat') : 'intLead') | tvfT: { n: k + 1 } }}</span><b class="tvf-nm">{{ c.name }}</b></div>
                  <div class="tvf-vp"><b [attr.data-fig]="'tv.int.' + c.id + '.votes'">{{ c.v | fmt }}</b><span [attr.data-fig]="'tv.int.' + c.id + '.share'">{{ c.vP | share }}</span></div>
                </article>
              }
            </div>
          } @else {<p class="tvf-wait">{{ (f.tied ? 'intTied' : 'intNoVotes') | tvfT }}</p>}
          @if (f.tied) {<p class="tvf-line">{{ 'intTied' | tvfT }}</p>} @else if (f.margin !== null) {<p class="tvf-line"><i></i>{{ 'intLine' | tvfT: { n: num(f.margin) } }}</p>}
          @if (view.wide()) {
            @if (f.rest.length) {
              <p class="tvf-micro tvf-rest-h">{{ 'intRest' | tvfT }}</p>
              <ol class="tvf-rest" #rest [attr.data-pages]="view.comp() === 'sign' ? '' : null" [attr.tabindex]="view.comp() === 'sign' ? null : 0" [attr.aria-label]="'intRest' | tvfT">
                @for (b of f.rest; track b.c.id) {<li class="tvf-cr"><span class="tvf-pos">{{ b.c.pos }}</span><span class="tvf-av sm" mjRaceAv [cand]="b.c"></span><span class="tvf-cr-m"><b class="tvf-nm">{{ b.c.name }}</b><span class="tvf-cbar"><i [style.--k]="b.w"></i></span></span><span class="tvf-vp sm"><b [attr.data-fig]="'tv.int.' + b.c.id + '.votes'">{{ b.c.v | fmt }}</b><span [attr.data-fig]="'tv.int.' + b.c.id + '.share'">{{ b.c.vP | share }}</span></span></li>}
              </ol>
            }
          } @else {
            @if (f.leaders.length && f.rest[0]; as nx) {
              <div class="tvf-nx"><span class="tvf-micro">{{ 'resNextIn' | tvfT }}</span>
                <div class="tvf-nrow"><span class="tvf-pos">{{ nx.c.pos }}</span><span class="tvf-av sm" mjRaceAv [cand]="nx.c"></span><b class="tvf-nm">{{ nx.c.name }}</b><span class="tvf-vp sm"><b [attr.data-fig]="'tv.int.' + nx.c.id + '.votes'">{{ nx.c.v | fmt }}</b><span [attr.data-fig]="'tv.int.' + nx.c.id + '.share'">{{ nx.c.vP | share }}</span></span></div>
              </div>
            }
          }
          @if (f.other; as o) {<p class="tvf-other"><span>{{ 'intOther' | tvfT }}</span><b>{{ o.v | fmt }}</b><span>{{ o.vP | share }}</span></p>}
        }
      </section>
      @if (view.comp() !== 'sign' && f.wil; as w) {<button type="button" class="tvf-all" (click)="all.emit()">{{ 'tvfAllCand' | tvfT: { n: w.cands.length } }}<svg tvfIcon="up"></svg></button>}
    }
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfResultsComponent {
  protected readonly view = inject(TvView);
  readonly all = output<void>();
  readonly picked = output<number>();
  protected readonly lit = computed(() => this.view.featured()?.i ?? -1);
  private readonly chips = viewChild<ElementRef<HTMLElement>>('chips');
  private readonly rest = viewChild<ElementRef<HTMLElement>>('rest');
  private readonly walk = inject(TvWalk);
  private readonly pager = new ListPager(inject(FrameLoop), this.walk.clock, 'tv');
  protected readonly num = fmt;

  constructor() {
    effect(() => {
      this.walk.shown();
      this.lit();
      const on =
        this.view.comp() === 'sign' &&
        this.walk.onView() === this.view.slide()?.uid &&
        !!this.view.featured()?.wil &&
        !!this.rest();
      untracked(() => {
        if (!on) return this.pager.stop();
        this.pager.run(() => this.rest()?.nativeElement ?? null, {
          time: this.walk.left(),
          travel: !this.walk.still(),
          wait: (ms) => this.walk.wait(ms),
        });
      });
    });
    inject(DestroyRef).onDestroy(() => this.pager.stop());
    const frames = inject(FrameLoop);
    effect(() => {
      const i = this.lit(),
        row = this.chips()?.nativeElement;
      if (!row || i < 0) return;
      let by = 0;
      untracked(() =>
        frames.once({
          read: () => {
            const chip = row.querySelector<HTMLElement>('[data-w="' + i + '"]');
            if (!chip) return;
            const c = chip.getBoundingClientRect(),
              r = row.getBoundingClientRect();
            by = c.left + c.width / 2 - (r.left + r.width / 2);
          },
          write: () => {
            if (Math.abs(by) > 1)
              row.scrollBy({ left: by, behavior: reducedMotion() ? 'auto' : 'smooth' });
          },
        }),
      );
    });
  }
}
