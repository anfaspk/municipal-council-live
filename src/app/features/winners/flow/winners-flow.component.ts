import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { ServerClock } from '../../../core/clock/server-clock.service';
import { NavHistory } from '../../../core/screen/nav-history';
import type { Screen } from '../../../core/screen/screen-prefs';
import { Fullscreen } from '../../../core/screen/fullscreen';
import { ScreenState } from '../../../core/screen/screen.state';
import { injectScreenComp } from '../../../core/screen/viewport.state';
import { WinnersStore } from '../../../data/winners.store';
import { GEO } from '../../../domain/geo/geo.data';
import { WCand, WWil } from '../../../domain/winners/winners';
import { FRAME_SCOPE } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { SlideClock } from '../../../shared/motion/slide-clock';
import { SwipeDirective } from '../../../shared/motion/swipe.directive';
import { AppbarComponent } from '../../../shared/ui/appbar/appbar.component';
import { trapTab } from '../../../shared/ui/focus-trap';
import { SheetComponent } from '../../../shared/ui/sheet/sheet.component';
import { tapZone } from '../../../shared/ui/story/story.model';
import { WinnerPhotos } from '../winner-photos';
import { WinnersMemo } from '../winners-memo';
import {
  placeholders,
  SCENE_IMG,
  stepIndex,
  titled,
  titleParts,
  WIL_STEP,
  winnersKey,
} from '../winners.model';
import { WinnersView } from '../winners.view';
import { WfCardComponent } from './wf-card.component';
import { WfFxComponent } from './wf-fx.component';
import { WfIconComponent } from './wf-icon.component';
import { WfPickComponent } from './wf-pick.component';
import { shareWinner } from './wf-share';
import { wf } from './wf-strings';
import { WfTPipe } from './wf-t.pipe';
import { WfWideComponent } from './wf-wide.component';
import { WfWilsComponent } from './wf-wils.component';
import { BAR, cardSize, govKey, govOfKey, segStates } from './winners-flow.model';

const TOAST_MS = 3000;

@Component({
  selector: 'div[winnersFlow]',
  imports: [
    AppbarComponent,
    SheetComponent,
    SwipeDirective,
    WfCardComponent,
    WfFxComponent,
    WfIconComponent,
    WfPickComponent,
    WfTPipe,
    WfWideComponent,
    WfWilsComponent,
  ],
  providers: [WinnersView, WinnerPhotos, { provide: FRAME_SCOPE, useValue: 'winners' }],
  host: {
    class: 'wf',
    role: 'dialog',
    'aria-modal': 'true',
    tabindex: '-1',
    'data-theme': 'night',
    '[attr.aria-label]': 'label',
    '[class.on]': 'isOpen()',
    '[class.still]': 'still',
    '[attr.data-comp]': 'comp()',
    '(document:keydown)': 'onKey($event)',
    '(click)': 'tap($event)',
  },
  templateUrl: './winners-flow.component.html',
  styleUrls: ['./winners-flow.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersFlowComponent {
  protected readonly view = inject(WinnersView);
  protected readonly screen = inject(ScreenState);
  protected readonly full = inject(Fullscreen);
  protected readonly store = inject(WinnersStore);
  private readonly nav = inject(NavHistory);
  private readonly photos = inject(WinnerPhotos);
  private readonly memo = inject(WinnersMemo);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly walk = new SlideClock();
  protected readonly counting = inject(ServerClock).counting;
  protected readonly comp = injectScreenComp();

  protected readonly label = wf('wfLabel');
  protected readonly bar = BAR;
  protected readonly scene = SCENE_IMG;
  protected readonly step = WIL_STEP;
  protected readonly still = reducedMotion();
  protected readonly isOpen = signal(false);
  protected readonly gov = signal<string | null>(null);
  protected readonly cur = signal(0);
  protected readonly lap = signal(0);
  protected readonly paused = signal(false);
  protected readonly held = signal(false);
  protected readonly sheet = signal<'wils' | 'menu' | null>(null);
  protected readonly toast = signal('');
  protected readonly say = signal('');

  protected readonly card = computed(
    () => this.view.cards().find((c) => c.id === this.gov()) ?? null,
  );
  protected readonly wils = this.view.wils;
  protected readonly wil = computed<WWil | null>(() => this.wils()[this.cur()] ?? null);
  protected readonly next = computed<WWil | null>(() => {
    const ws = this.wils();
    return ws.length > 1 ? (ws[(this.cur() + 1) % ws.length] ?? null) : null;
  });
  protected readonly walking = computed(() => this.wils().length > 1);
  protected readonly segs = computed(() => segStates(this.wils().length, this.cur()));
  protected readonly stopped = computed(() => this.paused() || this.held() || !!this.sheet());
  protected readonly govTitle = computed(() => {
    const c = this.card();
    return c ? titled(c.name, wf('wnGovWord')) : '';
  });
  protected readonly sheetLabel = computed(() =>
    this.sheet() === 'menu' ? wf('wfMenu') : wf('wfWilsOf', { gov: this.govTitle() }),
  );

  private opened = false;
  private pendWil: number | null = null;
  private stepSet = false;
  private stopNav: (() => void) | null = null;
  private focusDue = false;
  private toastT?: ReturnType<typeof setTimeout>;
  private swallow = false;

  constructor() {
    effect(() => {
      const on = this.screen.is('winners');
      untracked(() => (on ? this.open() : this.shut()));
    });
    effect(() => {
      const c = this.isOpen() ? this.card() : null;
      untracked(() => this.store.watch(c ? c.apiId : null));
    });
    effect(() => {
      const ws = this.wils(),
        n = ws.length;
      untracked(() => {
        if (this.pendWil !== null && n) {
          const i = ws.findIndex((w) => w.id === this.pendWil);
          this.pendWil = null;
          if (i >= 0) this.cur.set(i);
        }
        if (this.cur() >= n) this.cur.set(0);
        if (n && !this.stepSet) this.schedule();
      });
    });
    effect(() => {
      const w = this.wil(),
        state = this.view.load();
      if (this.focusDue && (w || state === 'wait' || state === 'failed'))
        untracked(() => this.focusName());
    });
    effect(() => {
      const g = this.gov(),
        pair = this.isOpen() && g ? [this.wil(), this.next()] : [];
      const urls = pair.flatMap((w) =>
        w?.published ? w.winners.flatMap((c) => (c.photo ? [c.photo] : [])) : [],
      );
      untracked(() => {
        this.store.show(pair[0]?.id ?? null, pair[1]?.id ?? null);
        this.photos.warm(g ? [SCENE_IMG, ...urls] : urls);
      });
    });
    effect(() => {
      const run = this.isOpen() && !!this.gov() && !this.stopped();
      untracked(() => (run ? this.walk.start() : this.walk.stop()));
    });
    this.memo.follow(this.isOpen, this.gov, () => this.wil()?.id ?? this.pendWil, this.paused);
    inject(DestroyRef).onDestroy(() => {
      this.walk.reset();
      this.store.watch(null);
      this.stopNav?.();
      clearTimeout(this.toastT);
    });
  }

  private open(): void {
    const handoff = this.screen.takeHandoff(),
      link = this.opened && !handoff ? null : this.screen.takeBootWil(),
      boot = handoff ?? link?.gov ?? (this.opened ? null : this.screen.bootRegion);
    const kept = handoff || link ? null : this.memo.kept(),
      g = kept ? kept.gov : boot;
    this.opened = true;
    this.isOpen.set(true);
    this.sheet.set(null);
    this.gov.set(g && Object.hasOwn(GEO.g, g) ? g : null);
    this.cur.set(0);
    this.pendWil = kept ? kept.wil : (link?.wil ?? null);
    this.paused.set(kept ? kept.paused : !!link && this.comp() !== 'sign');
    this.held.set(false);
    this.stepSet = false;
    this.stopNav = this.nav.listen('level', () => this.popped());
    this.focusName();
  }
  private shut(): void {
    if (!this.isOpen()) return;
    this.memo.clear();
    this.isOpen.set(false);
    this.gov.set(null);
    this.sheet.set(null);
    this.walk.reset();
    this.stepSet = false;
    this.stopNav?.();
    this.stopNav = null;
    this.nav.back('level');
  }


  protected pick(id: string, how: 'down' | 'side' = 'down'): void {
    if (!Object.hasOwn(GEO.g, id)) return;
    if (how === 'down') this.nav.push('level', { wn: govKey(id) }, location.href);
    else this.nav.replace({ wn: govKey(id) }, location.href);
    this.toGov(id);
  }
  private toGov(id: string | null): void {
    this.gov.set(id);
    this.cur.set(0);
    this.paused.set(false);
    this.stepSet = false;
    this.walk.reset();
    if (id) this.schedule();
    this.say.set(this.card()?.name ?? '');
    this.focusName();
  }
  protected back(): void {
    const g = this.gov();
    if (!g) return this.close();
    this.sheet.set(null);
    if (this.nav.state['wn'] === govKey(g)) history.back();
    else this.toGov(null);
  }
  private popped(): void {
    this.sheet.set(null);
    const g = govOfKey(this.nav.state['wn']);
    if (g !== this.gov()) this.toGov(g && Object.hasOwn(GEO.g, g) ? g : null);
  }
  protected close(): void {
    this.screen.leave('winners');
  }
  protected show(s: Screen): void {
    this.sheet.set(null);
    if (s !== 'winners') this.screen.show(s);
  }


  protected choose(i: number, fromSheet = false): void {
    if (fromSheet) this.focusName();
    this.sheet.set(null);
    this.cur.set(stepIndex(i, this.wils().length, 0));
    this.schedule();
    this.announce();
  }
  protected move(step: 1 | -1): void {
    if (this.gov()) this.choose(this.cur() + step);
  }
  protected togglePlay(): void {
    this.paused.update((p) => !p);
    this.say.set(wf(this.paused() ? 'wfPaused' : 'wfResume'));
  }
  protected hold(on: boolean): void {
    this.held.set(on);
    if (!on) this.swallow = true;
  }
  private schedule(): void {
    this.walk.reset();
    this.lap.update((n) => n + 1);
    this.stepSet = !!this.gov() && this.walking();
    if (!this.stepSet) return;
    this.walk.at(WIL_STEP, () => {
      this.cur.set(stepIndex(this.cur(), this.wils().length, 1));
      this.schedule();
    });
    if (this.isOpen() && !this.stopped()) this.walk.start();
  }
  private announce(): void {
    const w = this.wil();
    if (!w) return;
    this.say.set(
      w.name + ': ' + (w.published ? w.winners.map((c) => c.name).join('، ') : wf('wnPending')),
    );
  }

  protected tap(e: MouseEvent): void {
    if (this.swallow) return void (this.swallow = false);
    const target = e.target as Element;
    if (
      !this.gov() ||
      !target.closest('.wf-story') ||
      target.closest('a, button, input, select, dialog, label')
    )
      return;
    const box = this.host.getBoundingClientRect();
    this.move(tapZone(e.clientX, box.left, box.width, true) === 'next' ? 1 : -1);
  }


  protected share(c: WCand | null): void {
    const g = this.gov(),
      w = this.wil();
    if (g && w) void shareWinner(g, w, c).then((t) => t && this.flash(t));
  }
  private flash(text: string): void {
    clearTimeout(this.toastT);
    this.toast.set(text);
    this.toastT = setTimeout(() => this.toast.set(''), TOAST_MS);
  }

  protected title(w: WWil): { kind: string; name: string } {
    return titleParts(w.name, wf('wnWilayat'));
  }
  protected size = cardSize;
  protected seatsOf = (w: WWil): number[] => placeholders(w.seats);

  private focusName(): void {
    this.focusDue = true;
    afterNextRender(
      () => {
        if (!this.isOpen()) return;
        const el = this.host.querySelector<HTMLElement>('.wf-name');
        if (el) this.focusDue = false;
        (el ?? this.host).focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }


  protected onKey(e: KeyboardEvent): void {
    if (!this.isOpen() || this.sheet() || e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    const a = winnersKey(
      {
        key: e.key,
        keyCode: e.keyCode,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey,
        onButton: !!target?.closest('button'),
        onField: !!target?.closest('input, select'),
      },
      !!this.gov(),
    );
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button, select, input, [tabindex="0"]');
    e.preventDefault();
    if (a.type === 'fullscreen') return this.full.toggle();
    if (a.type === 'back') return this.back();
    if (a.type === 'play') return this.togglePlay();
    if (a.type === 'move') return this.move(a.step);
    this.choose(a.to === 'first' ? 0 : this.wils().length - 1);
  }
}
