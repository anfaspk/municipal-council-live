import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { CfIconComponent } from './cf-icon.component';
import { CfMapComponent } from './cf-map.component';
import { CfRingComponent } from './cf-ring.component';
import { CfTPipe } from './cf-t.pipe';
import { ST_KEY, STATUSES } from './count-flow.model';
import { CountView } from './count.view';

@Component({
  selector: 'section[cfGov]',
  imports: [CfIconComponent, CfMapComponent, CfRingComponent, CfTPipe, RaceAvatarComponent],
  host: { class: 'cf-page cf-gov' },
  template: `@if (view.govRow(); as r) {
    <header class="cf-ph"><p class="cf-kind">{{ 'cfKindGov' | cfT }}</p><h1 class="cf-name" tabindex="-1">{{ r.name }}</h1>
      <div class="cf-chips"><span [class]="'cf-chip cf-st ' + r.st"><i class="cf-dot" aria-hidden="true"></i>{{ st[r.st] | cfT }}</span>@if (r.ties) {<span class="cf-chip cf-chip-gold"><svg cfIcon="star"></svg>{{ 'cfTiesL' | cfT: { n: r.ties } }}</span>}</div></header>
    <div class="cf-card cf-headcard"><div class="cf-ringrow"><div [cfRing]="ratio()"><b class="cf-ring-fig" [attr.data-fig]="'count.gov.' + r.id + '.cP'">{{ r.p }}</b></div>
      <div class="cf-ringtxt"><p class="cf-say">{{ 'cfSay' | cfT: { c: r.counted, t: r.cast } }}</p>
        <span class="cf-segbar" aria-hidden="true">@for (s of r.segs; track s.st) {<i [class]="'cf-st ' + s.st" [style.--k]="s.k"></i>}</span>
        <small>{{ 'cfDoneOf' | cfT: { d: r.done, n: r.n } }}</small></div></div>
    <div class="cf-figs">
      <div class="cf-fig left"><span>{{ 'cxUncounted' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.gov.' + r.id + '.left'">{{ r.left }}</b></div>
      <div class="cf-fig m"><span>{{ 'cxMaleV' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.gov.' + r.id + '.m'">{{ r.m }}</b><small class="mj-num">{{ r.mP }}</small></div>
      <div class="cf-fig f"><span>{{ 'cxFemaleV' | cfT }}</span><b class="mj-num" [attr.data-fig]="'count.gov.' + r.id + '.f'">{{ r.f }}</b><small class="mj-num">{{ r.fP }}</small></div>
    </div></div>
    <div class="cf-card cf-mapcard"><div cfMap [govs]="view.store.govs" [gid]="r.id" (pickWil)="pick.emit($event)"></div>
      <ul class="cf-legend">@for (s of statuses; track s) {<li [class]="'cf-st ' + s"><i class="cf-dot" aria-hidden="true"></i>{{ st[s] | cfT }}</li>}</ul></div>
    <div class="cf-sec"><div><p class="cf-micro">{{ 'cfWils' | cfT }}</p><h2 class="cf-h2">{{ 'cfWilsH' | cfT }}</h2></div></div>
    <ol class="cf-rows">
      @for (w of view.wils(); track w.id) {
        <li><button type="button" [class]="'cf-row cf-st ' + w.st" [class.on]="lit() === w.id" [attr.aria-current]="lit() === w.id ? 'true' : null" [attr.data-w]="w.id" (click)="pick.emit(w.id)">
          <i class="cf-dot" aria-hidden="true"></i>
          <span class="cf-row-m"><b class="cf-row-n">{{ w.name }}@if (w.tie === 'open') {<span class="cf-tie"><svg cfIcon="star"></svg>{{ 'cfTie' | cfT }}</span>} @else if (w.tie === 'drawn') {<span class="cf-tie"><svg cfIcon="crown"></svg>{{ 'cfDrawnTag' | cfT }}</span>}</b>
            <span class="cf-lead">@for (c of w.leaders; track c.id) {<span class="cf-av" mjRaceAv [cand]="c"></span>}<span class="cf-lead-n">{{ w.leaders.length ? names(w.leaders) : (st[w.st] | cfT) }}</span></span>
            <span class="cf-pbar" aria-hidden="true"><i [style.--k]="w.k"></i></span></span>
          <span class="cf-row-e"><b class="mj-num">{{ w.p }}</b><small>{{ 'cxSeatsN' | cfT: { s: w.seats } }}</small></span>
          <svg cfIcon="go" class="cf-go"></svg>
        </button></li>
      }
    </ol>
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfGovComponent {
  protected readonly view = inject(CountView);
  readonly pick = output<number>();
  readonly lit = input<number | null>(null);
  protected readonly statuses = STATUSES;
  protected readonly st = ST_KEY;
  protected readonly ratio = computed(() => {
    const g = this.view.gov();
    if (!g) return 0;
    const cast = g.wil.reduce((n, w) => n + w.cast, 0);
    return cast ? g.wil.reduce((n, w) => n + w.counted, 0) / cast : 0;
  });
  protected readonly names = (l: readonly { name: string }[]): string =>
    l.map((c) => c.name).join('، ');
}
