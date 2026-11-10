import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../core/clock/server-clock.service';
import { AcceptStore } from '../../data/accept.store';
import {
  AcceptState,
  AcceptView,
  acceptView,
  leftClock,
  parseAcceptLink,
} from '../../domain/conflict/accept';
import { AmbientComponent } from '../../shared/ui/ambient.component';
import { LOGO_DARK } from '../../shared/ui/brand';
import { HorizonComponent } from '../../shared/ui/horizon.component';
import { AcceptAvatarComponent } from './accept-avatar.component';
import { AcceptGlyphComponent, CaGlyph } from './accept-glyph.component';
import { AcceptStepsComponent } from './accept-steps.component';
import { at } from './accept-strings';
import { AcceptTieComponent } from './accept-tie.component';
import { CaTPipe } from './ca-t.pipe';

const WARN = 60 * 1000;
const LATE = 20 * 1000;

interface Msg {
  icon: CaGlyph;
  tone: 'ok' | 'warn' | 'bad' | 'mute';
  title: string;
  sub: string | null;
  chip: string | null;
}
function msgOf(s: AcceptState, v: AcceptView, fresh: boolean): Msg | null {
  const m = (
    icon: CaGlyph,
    tone: Msg['tone'],
    title: string,
    sub: string | null,
    chip: string | null = null,
  ): Msg => ({ icon, tone, title: at(title), sub: sub && at(sub), chip });
  switch (s) {
    case 'accepted':
      return m('check', 'ok', fresh ? 'caDone' : 'caAlready', 'caDoneSub');
    case 'expired':
      return m(
        'clock',
        'warn',
        'caExpired',
        'caExpiredSub',
        v.more ? at('caMore', { n: v.more }) : null,
      );
    case 'final':
      return m('clock', 'warn', 'caFinal', 'caFinalSub');
    case 'drawn':
      return v.me?.won
        ? m('check', 'ok', 'caWon', 'caPending', v.me.seat ? at('caSeat', { n: v.me.seat }) : null)
        : { ...m('dash', 'mute', 'caLost', null), sub: at('caLostSub') + ' ' + at('caPending') };
    case 'unknown':
      return m('alert', 'warn', 'caUnknown', 'caUnknownSub');
    case 'invalid':
      return m('alert', 'bad', 'caInvalid', 'caInvalidSub');
    case 'gone':
      return m('alert', 'bad', 'caGone', 'caGoneSub');
    case 'nodraw':
      return m('dash', 'mute', 'caNoDraw', 'caNoDrawSub');
    default:
      return null;
  }
}

@Component({
  selector: 'app-root',
  imports: [
    AmbientComponent,
    HorizonComponent,
    AcceptAvatarComponent,
    AcceptGlyphComponent,
    AcceptTieComponent,
    AcceptStepsComponent,
    CaTPipe,
  ],
  host: { class: 'mj-root ca-root', 'data-theme': 'night', dir: 'rtl', lang: 'ar' },
  templateUrl: './accept.component.html',
  styleUrl: './accept.scss',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptComponent {
  protected readonly store = inject(AcceptStore);
  private readonly clock = inject(ServerClock);
  protected readonly logo = LOGO_DARK;
  private readonly now = signal(this.clock.now());
  private readonly msgEl = viewChild<ElementRef<HTMLElement>>('msg');

  protected readonly v = computed(() =>
    acceptView(this.store.link, this.store.read(), this.now(), this.store.outcome()),
  );
  protected readonly state = computed(() => this.v().state);
  protected readonly canConfirm = computed(
    () => this.state() === 'open' || this.state() === 'unknown',
  );
  protected readonly msg = computed(() =>
    msgOf(this.state(), this.v(), this.store.outcome() === 'accepted'),
  );
  protected readonly place = computed(() => {
    const { wilayat: w, region: r } = this.v();
    return w ? at(r ? 'caPlace' : 'caPlaceW', r ? { w, r } : { w }) : null;
  });
  protected readonly left = computed(() => {
    const c = this.v().round?.clock;
    return this.state() === 'open' && c ? Math.max(0, c.endsAt - this.now()) : null;
  });
  protected readonly share = computed(() => {
    const l = this.left(),
      c = this.v().round?.clock;
    return l === null || !c ? 0 : l / c.total;
  });
  protected readonly time = computed(() => {
    const l = this.left();
    return l === null ? '' : leftClock(l);
  });
  protected readonly urgent = computed(() => {
    const l = this.left();
    return l === null ? null : l <= LATE ? 'late' : l <= WARN ? 'warn' : null;
  });
  protected readonly roundText = computed(() => {
    const r = this.v().round;
    if (!r) return null;
    return r.max ? at('caRound', { r: r.n, max: r.max }) : at('caRoundN', { r: r.n });
  });

  constructor() {
    const doc = inject(DOCUMENT);
    doc.title = at('caDocTitle');
    doc.documentElement.setAttribute('data-theme', 'night');
    this.store.open(parseAcceptLink(doc.location.search));
    const tick = setInterval(() => this.now.set(this.clock.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(tick));
    effect(() => {
      if (this.store.outcome() === null || this.store.sending() || this.canConfirm()) return;
      untracked(() => setTimeout(() => this.msgEl()?.nativeElement.focus({ preventScroll: true })));
    });
  }

  protected confirm(): void {
    void this.store.confirm();
  }
  protected retry(): void {
    this.store.retry();
  }
}
