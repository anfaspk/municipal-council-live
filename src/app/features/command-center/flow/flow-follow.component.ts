import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { ScreenState } from '../../../core/screen/screen.state';
import { CountStore } from '../../../data/count.store';
import { TurnoutStore } from '../../../data/turnout.store';
import { WinnersStore } from '../../../data/winners.store';
import { fmt, sharePct } from '../../../domain/format';
import { DetailState } from '../detail/detail.state';
import { FlIconComponent } from './fl-icon.component';
import { FlTPipe } from './fl-t.pipe';
import { FollowPref } from './follow-pref';
import { followCount, followPhase, followVote, followWin, placeWils } from './follow.model';
import { ringDash, RING_R } from './flow.model';
import { fl } from './flow-strings';

@Component({
  selector: 'section[flFollow]',
  imports: [FlTPipe, FlIconComponent],
  host: {
    class: 'fl-card fl-follow',
    '[attr.aria-label]': 'label',
    '[attr.data-phase]': 'phase()',
  },
  template: `@let f = pref.place()!;
    <div class="fl-follow-h"><svg flIcon="star"></svg><span>{{ 'flFollowHead' | flT: { k: kind() } }}</span><button type="button" class="fl-link" (click)="pref.toggle(f)">{{ 'flFollowOff' | flT }}</button></div>
    @switch (phase()) {
    @case ('vote') {@if (vote(); as v) {
      <div class="fl-follow-b"><div class="fl-follow-txt"><b class="fl-follow-name">{{ v.name }}</b>
        <div class="fl-chips"><span class="fl-chip">{{ v.within ? ('flFollowRankIn' | flT: { r: v.rank, n: v.of, g: v.within }) : ('flRankOf' | flT: { r: v.rank, n: v.of }) }}</span><span class="fl-chip band" [class]="v.band"><i aria-hidden="true"></i>{{ 'flBand-' + v.band | flT }}</span></div>
        <p class="fl-say small">{{ 'flFollowSay' | flT: { v: fmt(v.voted), r: fmt(v.reg) } }}</p></div>
        <div class="fl-ring sm" [class]="v.band"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" [attr.r]="r"/><circle class="arc" cx="50" cy="50" [attr.r]="r" [attr.stroke-dasharray]="dash(v.t / 100)" transform="rotate(-90 50 50)"/></svg><div class="fl-ring-in"><b class="fl-ink" [class]="v.band">{{ v.pct }}</b></div></div></div>
      <button type="button" class="fl-btn ghost" (click)="openPage()">{{ 'flFollowOpen-' + (f.wil === null ? 'gov' : 'wil') | flT }}<svg flIcon="back"></svg></button>
    } @else {<p class="fl-gs-note">{{ 'flFollowWait' | flT }}</p>}}
    @case ('count') {@if (count(); as c) {
      <div class="fl-follow-b"><div class="fl-follow-txt"><b class="fl-follow-name">{{ c.name }}</b>
        <div class="fl-chips"><span class="fl-chip st" [class]="c.st">{{ 'flSt-' + c.st | flT }}</span>@if (c.seats) {<span class="fl-chip">{{ seatN(c.seats) }}</span>} @else {<span class="fl-chip">{{ 'flFollowDone' | flT: { d: c.done, n: c.n } }}</span>}</div>
        <p class="fl-say small">{{ 'flFollowCounted' | flT: { c: fmt(c.counted), t: fmt(c.cast) } }}</p></div>
        <div class="fl-ring sm"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" [attr.r]="r"/><circle class="arc" cx="50" cy="50" [attr.r]="r" [attr.stroke-dasharray]="dash(c.k)" transform="rotate(-90 50 50)"/></svg><div class="fl-ring-in"><b>{{ c.pct }}</b><small>{{ 'flFollowCountL' | flT }}</small></div></div></div>
      @if (c.holders.length) {<ol class="fl-follow-seats">@for (h of c.holders; track h.seat) {<li><em>{{ h.seat }}</em><b>{{ h.name }}</b><span>{{ 'flVoteN' | flT: { n: fmt(h.v) } }}</span></li>}</ol>}
      <button type="button" class="fl-btn ghost" (click)="openOn('wall')">{{ c.name }} {{ 'flFollowToCount' | flT }}<svg flIcon="back"></svg></button>
    } @else {<p class="fl-gs-note">{{ 'flFollowWait' | flT }}</p>}}
    @case ('win') {@if (win(); as w) {
      <div class="fl-follow-wh"><b class="fl-follow-name">{{ w.name }}</b><span class="fl-chip gold">{{ 'flFollowWinT' | flT }}</span></div>
      @if (w.winners.length) {<ol class="fl-follow-wins">@for (c of w.winners; track c.id) {<li><span class="fl-follow-av" aria-hidden="true"><i>{{ c.ini }}</i>@if (c.thumb) {<img [src]="c.thumb" alt="" loading="lazy" decoding="async" (error)="$any($event.target).remove()">}</span><b>{{ c.name }}</b><small>{{ 'flVoteN' | flT: { n: c.votes === null ? '—' : fmt(c.votes) } }} · {{ share(c.share) }}</small><em>{{ 'flFollowSeat' | flT: { n: c.pos } }}</em></li>}</ol>}
      @else {<p class="fl-say small">{{ 'flFollowTally' | flT: { d: w.done, n: w.n } }}</p>}
      <button type="button" class="fl-btn ghost" (click)="openOn('winners')">{{ 'flFollowToWin' | flT: { w: w.name } }}<svg flIcon="back"></svg></button>
    } @else {<p class="fl-gs-note">{{ 'flFollowWait' | flT }}</p>}}
    }`,
  styleUrls: ['./flow-follow.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowFollowComponent {
  protected readonly label = fl('flFollowL');
  protected readonly pref = inject(FollowPref);
  private readonly stats = inject(TurnoutStore);
  private readonly countStore = inject(CountStore);
  private readonly winners = inject(WinnersStore);
  private readonly clock = inject(ServerClock);
  private readonly screen = inject(ScreenState);
  private readonly detail = inject(DetailState);
  protected readonly r = RING_R;
  protected readonly fmt = fmt;
  protected readonly share = sharePct;
  protected readonly dash = ringDash;
  private readonly onView = signal(false);

  protected readonly kind = computed(() =>
    fl('flFollowKind-' + (this.pref.place()?.wil === null ? 'gov' : 'wil')),
  );
  protected readonly phase = computed(() => {
    const f = this.pref.place();
    return followPhase(this.clock.counting(), f ? placeWils(f, this.countStore.govs) : null);
  });
  protected readonly vote = computed(() => {
    const f = this.pref.place();
    return f ? followVote(f, this.stats.govs()) : null;
  });
  protected readonly count = computed(() => {
    const f = this.pref.place();
    return f ? followCount(f, this.countStore.govs) : null;
  });
  protected readonly win = computed(() => {
    const f = this.pref.place();
    return f ? followWin(f, this.winners.data(), placeWils(f, this.countStore.govs)) : null;
  });

  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    let io: IntersectionObserver | null = null;
    afterNextRender(() => {
      io = new IntersectionObserver(([e]) => this.onView.set(!!e?.isIntersecting));
      io.observe(host);
    });
    effect(() => {
      const f = this.pref.place();
      untracked(() => {
        if (f?.wil != null) this.stats.needRegions(this, [+f.gov]);
        else this.stats.release(this);
      });
    });
    effect(() => {
      const f = this.pref.place(),
        live = !!f && this.clock.counting() && this.onView() && this.screen.is('dashboard'),
        win = live && this.phase() === 'win';
      untracked(() => {
        if (live) this.countStore.start(this);
        else this.countStore.stop(this);
        if (win) {
          this.winners.watch(+f!.gov);
          this.winners.show(f!.wil);
        } else if (this.screen.is('dashboard') && this.winners.region() === (f ? +f.gov : -1))
          this.winners.watch(null);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      io?.disconnect();
      this.stats.release(this);
      this.countStore.stop(this);
    });
  }

  protected seatN = (n: number) => fl('flSeatN', { n });
  protected openPage(): void {
    const f = this.pref.place();
    if (f) this.detail.open(f.wil === null ? { gov: f.gov } : { gov: f.gov, wil: f.wil });
  }
  protected openOn(s: 'wall' | 'winners'): void {
    const f = this.pref.place();
    if (f) this.screen.openOn(s, f.gov, f.wil);
  }
}
