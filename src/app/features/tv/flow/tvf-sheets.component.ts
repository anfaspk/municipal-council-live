import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { ScreenState } from '../../../core/screen/screen.state';
import { Fullscreen } from '../../../core/screen/fullscreen';
import { TurnoutStore } from '../../../data/turnout.store';
import { fmt, pct } from '../../../domain/format';
import { FmtPipe, PctPipe, SharePipe } from '../../../shared/ui/format.pipes';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { TV_SECS } from '../../../shared/ui/tv-prefs';
import { TvView } from '../tv.view';
import { TvfIconComponent } from './tvf-icon.component';
import { TvfMoreComponent } from './tvf-more.component';
import { TvfTPipe } from './tvf-t.pipe';

export type TvfSheet = 'more' | 'wils' | 'cands' | 'set';

@Component({
  selector: 'div[tvfSheets]',
  imports: [
    FmtPipe,
    PctPipe,
    SharePipe,
    RaceAvatarComponent,
    TvfIconComponent,
    TvfMoreComponent,
    TvfTPipe,
  ],
  host: { class: 'tvf-sh' },
  template: `@switch (kind()) {
    @case ('more') {
      @if (view.nat(); as n) {
        <p class="tvf-sh-kind">{{ 'national' | tvfT }}</p><h2 class="tvf-sh-name">{{ 'tvfMore' | tvfT }}</h2>
        <div tvfMore [gender]="n.gender" [hours]="true"></div>
      }
    }
    @case ('wils') {
      @if (view.gov(); as g) {
        <p class="tvf-sh-kind">{{ 'tvGov' | tvfT }}</p><h2 class="tvf-sh-name">{{ g.name }}<b class="tvf-ink" [class]="g.band">{{ g.turnout | pct }}</b></h2>
        <p class="tvf-say small">{{ 'tvfWilHead' | tvfT: { n: g.wilayat.length } }}</p>
        <ol class="tvf-list flat">
          @for (w of g.wilayat; track w.id) {<li class="tvf-row" [class]="w.band"><span class="tvf-rank">{{ w.rank }}</span><span class="tvf-row-m"><b>{{ w.name }}</b><span class="tvf-bar"><i [style.--k]="w.t / 100"></i></span></span><span class="tvf-row-e"><b class="tvf-ink">{{ w.t | pct }}</b><small>{{ 'tvfOf' | tvfT: { v: num(w.voted), r: num(w.reg) } }}</small></span></li>}
        </ol>
      }
    }
    @case ('cands') {
      @if (view.featured(); as f) {
        @if (f.wil; as w) {
          <p class="tvf-sh-kind">{{ 'tvfWilKind' | tvfT: { g: view.gov()?.name ?? '' } }}</p><h2 class="tvf-sh-name">{{ f.name }}<span class="tvf-chip sm">{{ 'resCands' | tvfT: { n: w.candCount } }}</span></h2>
          <ol class="tvf-cands">
            @for (c of f.leaders; track c.id) {<li class="tvf-cr seat"><span class="tvf-pos">{{ c.pos }}</span><span class="tvf-av sm" mjRaceAv [cand]="c"></span><span class="tvf-cr-m"><b class="tvf-nm">{{ c.name }}</b><span class="tvf-cbar"><i [style.--k]="share(c.v)"></i></span></span><span class="tvf-vp sm"><b>{{ c.v | fmt }}</b><span>{{ c.vP | share }}</span></span></li>}
            @if (f.leaders.length) {<li class="tvf-cline"><i></i>{{ f.tied ? ('intTied' | tvfT) : ('intLine' | tvfT: { n: num(f.margin ?? 0) }) }}</li>}
            @for (b of f.rest; track b.c.id) {<li class="tvf-cr"><span class="tvf-pos">{{ b.c.pos }}</span><span class="tvf-av sm" mjRaceAv [cand]="b.c"></span><span class="tvf-cr-m"><b class="tvf-nm">{{ b.c.name }}</b><span class="tvf-cbar"><i [style.--k]="b.w"></i></span></span><span class="tvf-vp sm"><b>{{ b.c.v | fmt }}</b><span>{{ b.c.vP | share }}</span></span></li>}
            @if (f.other; as o) {<li class="tvf-cr other"><span class="tvf-pos"></span><span class="tvf-av sm none"></span><span class="tvf-cr-m"><b class="tvf-nm">{{ 'intOther' | tvfT }}</b><span class="tvf-cbar"><i [style.--k]="o.w"></i></span></span><span class="tvf-vp sm"><b>{{ o.v | fmt }}</b><span>{{ o.vP | share }}</span></span></li>}
          </ol>
          <p class="tvf-honest"><i></i>{{ 'intNote' | tvfT }}</p>
        }
      }
    }
    @case ('set') {
      <p class="tvf-sh-kind">{{ 'tvfSetKind' | tvfT }}</p><h2 class="tvf-sh-name">{{ 'tvfSettings' | tvfT }}</h2>
      <label class="tvf-opt"><span><b>{{ 'scrHere' | tvfT }}</b></span>
        <select class="tvf-select" (change)="region($event)">
          <option value="nat" [selected]="screen.region() === 'nat'">{{ 'tvOman' | tvfT }}</option>
          @for (g of govs(); track g.id) {<option [value]="g.id" [selected]="screen.region() === g.id">{{ g.ar }}</option>}
        </select></label>
      <button type="button" class="tvf-opt" role="switch" [attr.aria-checked]="!pinned()" (click)="rotate()"><span><b>{{ 'scrRotate' | tvfT }}</b><small>{{ 'tvfRotD' | tvfT }}</small></span><i class="tvf-sw" [class.on]="!pinned()" aria-hidden="true"></i></button>
      <div class="tvf-opt col" role="group" [attr.aria-label]="'tvTime' | tvfT"><b>{{ 'tvTime' | tvfT }}</b><div class="tvf-seg">@for (n of secs; track n) {<button type="button" [class.on]="sec() === n" [attr.aria-pressed]="sec() === n" (click)="secChange.emit(n)">{{ 'tvSec' | tvfT: { n } }}</button>}</div></div>
      <button type="button" class="tvf-opt" role="switch" [attr.aria-checked]="still()" [attr.aria-disabled]="osStill() ? 'true' : null" (click)="stillChange.emit(!still())"><span><b>{{ 'tvStill' | tvfT }}</b><small>{{ 'tvfStillD' | tvfT }}</small></span><i class="tvf-sw" [class.on]="still()" aria-hidden="true"></i></button>
      @if (full.offered()) {<button type="button" class="tvf-opt link" (click)="full.toggle()"><svg [tvfIcon]="full.on() ? 'unfull' : 'full'"></svg><b>{{ (full.on() ? 'fullOff' : 'tvfFull') | tvfT }}</b></button>}
      <button type="button" class="tvf-opt link" (click)="screen.leave('tv')"><svg tvfIcon="grid"></svg><b>{{ 'tvfBack' | tvfT }}</b></button>
    }
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfSheetsComponent {
  protected readonly view = inject(TvView);
  protected readonly screen = inject(ScreenState);
  private readonly stats = inject(TurnoutStore);
  readonly kind = input.required<TvfSheet>();
  readonly sec = input.required<number>();
  readonly still = input.required<boolean>();
  readonly osStill = input(false);
  readonly secChange = output<number>();
  readonly stillChange = output<boolean>();
  protected readonly secs = TV_SECS;
  protected readonly govs = this.stats.govs;
  protected readonly pinned = computed(() => this.screen.rotation() === 'pinned');
  protected readonly full = inject(Fullscreen);
  protected readonly num = fmt;
  protected readonly pc = pct;
  protected share(v: number): number {
    const most = this.view.featured()?.wil?.cands.reduce((m, c) => Math.max(m, c.v), 0) ?? 0;
    return most > 0 ? Math.min(1, v / most) : 0;
  }
  protected region(e: Event): void {
    this.screen.setRegion((e.target as HTMLSelectElement).value);
  }
  protected rotate(): void {
    this.screen.setRotation(this.pinned() ? 'auto' : 'pinned');
  }
}
