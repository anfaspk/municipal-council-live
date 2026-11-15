import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { STAGE_TEXT } from '../draw/draw.model';
import { CfBoardComponent } from './cf-board.component';
import { CfIconComponent } from './cf-icon.component';
import { CfRingComponent } from './cf-ring.component';
import { cf } from './cf-strings';
import { CfTPipe } from './cf-t.pipe';
import { ST_KEY } from './count-flow.model';
import { CountView } from './count.view';

const TIE_TEXT = { f1: 'cxTieF1', f2: 'cxTieF2', s: 'cxTieS2' } as const;

@Component({
  selector: 'section[cfWil]',
  imports: [CfBoardComponent, CfIconComponent, CfRingComponent, CfTPipe],
  host: { class: 'cf-page cf-wil' },
  template: `@if (view.wil(); as w) {
    @let h = view.head()!;
    <header class="cf-ph"><p class="cf-kind">{{ 'cfKindWil' | cfT }}</p><h1 class="cf-name" tabindex="-1">{{ w.ar }}</h1>
      <div class="cf-chips"><span [class]="'cf-chip cf-st ' + h.st"><i class="cf-dot" aria-hidden="true"></i>{{ st[h.st] | cfT }}</span>@if (h.seats) {<span class="cf-chip">{{ 'cxSeatsN' | cfT: { s: h.seats } }}</span>}<span class="cf-chip">{{ 'cCandCount' | cfT: { n: h.cands } }}</span></div></header>
    <div class="cf-card cf-headcard">
      <div class="cf-ringrow"><div [cfRing]="h.k"><b class="cf-ring-fig">{{ h.p }}</b></div>
        <div class="cf-ringtxt"><p class="cf-say">{{ 'cfSay' | cfT: { c: h.counted, t: h.cast } }}</p>@if (h.seats) {<small>{{ 'cfCandsOn' | cfT: { n: h.cands, s: h.seats } }}</small>}</div></div>
      <div class="cf-figs two">
        <div class="cf-fig"><span>{{ 'cCounted' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.wil.' + w.id + '.counted'">{{ h.counted }}</b><small class="mj-num" [attr.data-fig]="'count.wil.' + w.id + '.cP'">{{ h.cP }}</small></div>
        <div class="cf-fig left"><span>{{ 'cxUncounted' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.wil.' + w.id + '.left'">{{ h.left }}</b><small class="mj-num">{{ 'cOfCast' | cfT: { v: h.cast } }}</small></div>
        <div class="cf-fig m"><span>{{ 'cxMaleV' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.wil.' + w.id + '.m'">{{ h.m }}</b><small class="mj-num">{{ h.mP }}</small></div>
        <div class="cf-fig f"><span>{{ 'cxFemaleV' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.wil.' + w.id + '.f'">{{ h.f }}</b><small class="mj-num">{{ h.fP }}</small></div>
      </div>
    </div>
    @if (view.tie(); as t) {
      <div class="cf-tieline" [class.drawn]="t.state === 'drawn'">
        <b>{{ tieText() }}</b><small>{{ tieSub() }}</small>
        <button type="button" class="cf-btn gold" [attr.aria-label]="'cxTossGoL' | cfT: { w: w.ar }" (click)="draw.emit()"><svg cfIcon="play"></svg>{{ 'cxTossGo' | cfT }}</button>
      </div>
    }
    @if (view.board(); as b) {
      <div [cfBoard]="b" [tied]="view.tiedIds()" [drawWins]="view.drawWins()" [nota]="w.counted > 0 ? { v: w.nota, p: w.notaP } : null"></div>
    } @else {
      <p class="cf-wait">{{ (w.st === 'await' ? 'cAwaitBox' : 'cxdLoadingC') | cfT }}</p>
    }
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfWilComponent {
  protected readonly view = inject(CountView);
  readonly draw = output<void>();
  protected readonly st = ST_KEY;
  protected readonly tieText = computed(() => {
    const t = this.view.tie();
    if (!t) return '';
    return cf(t.state === 'drawn' ? 'cxDrawn' : t.kind ? TIE_TEXT[t.kind] : 'cxTie');
  });
  protected readonly tieSub = computed(() => {
    const t = this.view.tie();
    if (!t) return '';
    return cf(t.state === 'drawn' ? 'cxDrawnSub' : STAGE_TEXT[t.stage]);
  });
}
