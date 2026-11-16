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
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { guard } from '../../../core/log/log';
import { screenComp } from '../../../core/screen/layout.model';
import { ViewportState } from '../../../core/screen/viewport.state';
import { FRAME_SCOPE } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { SwipeDirective } from '../../../shared/motion/swipe.directive';
import { trapTab } from '../../../shared/ui/focus-trap';
import { SheetComponent } from '../../../shared/ui/sheet/sheet.component';
import { tapZone } from '../../../shared/ui/story/story.model';
import { saveTvPrefs } from '../../../shared/ui/tv-prefs';
import { ScreenUpdates } from '../../screens/screen-updates';
import { tvKey } from '../tv-keys';
import { NATIONAL } from '../tv-slide.model';
import { TvView } from '../tv.view';
import { TvWalk } from '../tv-walk';
import { segState, storySegs } from './tv-flow.model';
import { TvfChromeComponent } from './tvf-chrome.component';
import { TvfGovComponent } from './tvf-gov.component';
import { TvfIconComponent } from './tvf-icon.component';
import { TvfNationalComponent } from './tvf-national.component';
import { mod, TvfPlayer } from './tvf-player';
import { TvfResultsComponent } from './tvf-results.component';
import { TvfSheetsComponent, type TvfSheet } from './tvf-sheets.component';
import { tvf } from './tvf-strings';
import { TvfTPipe } from './tvf-t.pipe';
import { TvfWideComponent } from './tvf-wide.component';

const IDLE_MS = 4000;

@Component({
  selector: 'div[tvFlow]',
  imports: [
    SwipeDirective,
    SheetComponent,
    TvfChromeComponent,
    TvfNationalComponent,
    TvfGovComponent,
    TvfResultsComponent,
    TvfSheetsComponent,
    TvfIconComponent,
    TvfTPipe,
    TvfWideComponent,
  ],
  providers: [TvView, TvWalk, { provide: FRAME_SCOPE, useValue: 'tv' }],
  host: {
    class: 'tvf',
    tabindex: '-1',
    '[class.on]': 'isOpen()',
    '[class.idle]': 'idle()',
    '[class.pinned]': 'pinned()',
    '[class.still]': 'still()',
    '[attr.data-comp]': 'comp()',
    '(document:keydown)': 'onKey($event)',
    '(click)': 'tap($event)',
  },
  templateUrl: './tv-flow.component.html',
  styleUrls: ['./tv-flow.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvFlowComponent extends TvfPlayer {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly viewport = inject(ViewportState);
  protected readonly comp = computed(() => {
    const { w, h } = this.viewport.size();
    return screenComp(w, h, this.viewport.anyCoarse());
  });

  private readonly held = signal(false);
  protected readonly idle = signal(false);
  protected readonly still = signal(false);
  protected readonly osReduced = signal(false);
  protected readonly sheet = signal<TvfSheet | null>(null);
  protected readonly segs = computed(() => {
    const g = this.view.gov(),
      walk = this.walking() && g ? { n: g.wilayat.length, lit: this.view.spot() } : null,
      s = storySegs(this.keys().length, this.k(), walk);
    return Array.from({ length: s.n }, (_, i) => segState(i, s.at));
  });
  protected readonly sheetLabel = computed(() => {
    const k = this.sheet();
    return tvf(
      k === 'more'
        ? 'tvfMore'
        : k === 'wils'
          ? 'tvfWils'
          : k === 'cands'
            ? 'intAll'
            : 'tvfSettings',
    );
  });
  protected readonly label = computed(() =>
    this.keys().length ? this.slideLabel(this.k(), true) : tvf('tvfLabel'),
  );

  private readonly body = viewChild<ElementRef<HTMLElement>>('body');
  private idleTimer?: ReturnType<typeof setTimeout>;
  private swallow = false;

  constructor() {
    super();
    this.still.set(reducedMotion() || this.prefs.still);
    this.walker.left = () => this.walkLeft();
    this.walker.wait = (ms) => this.walkWait(ms);
    this.walker.still = () => this.still();
    effect(() => this.view.comp.set(this.comp()));
    inject(ScreenUpdates)
      .tv.pipe(takeUntilDestroyed())
      .subscribe((e) => {
        if (e.type === 'pull' || e.type === 'resume') guard('tv refresh', () => this.refresh());
      });
    effect(() => {
      const on = this.screen.is('tv');
      untracked(() => (on ? this.start() : this.stop()));
    });
    effect(() => {
      const at = this.screen.region() + '|' + this.pinned();
      untracked(() => {
        if (!this.isOpen() || at === this.placed) return;
        this.placed = at;
        if (this.pinned()) this.paused.set(false);
        this.show(this.keyIndex(this.screen.region()), true);
      });
    });
    effect(() => this.interim.watch(this.isOpen()));
    effect(() => {
      const now = this.inter();
      untracked(() => {
        if (now) this.tabs.open();
        if (this.isOpen() && this.keys().length && now !== this.walking()) this.show(this.k());
      });
    });
    effect(() => {
      const g = this.view.gov();
      if (!g || !this.inter()) return;
      const w = g.wilayat[Math.max(0, this.view.spot())];
      if (w) untracked(() => this.interim.want(w.id));
    });
    effect(() => {
      const keys = this.keys(),
        k = this.k();
      if (!this.isOpen() || !keys.length) return untracked(() => this.stats.release(this));
      const ids = [keys[k], keys[mod(k + 1, keys.length)]]
        .filter((x): x is string => !!x && x !== NATIONAL)
        .map(Number);
      untracked(() => (ids.length ? this.stats.needRegions(this, ids) : this.stats.release(this)));
    });
    const govKey = computed(() => this.view.gov()?.key ?? null);
    effect(() => {
      const key = govKey();
      if (key !== null && this.stats.regionRead(Number(key))) untracked(() => this.refresh());
    });
    effect(() => {
      const run = this.running();
      untracked(() => (run ? this.clock.start() : this.clock.stop()));
    });
    const ro =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            const inner = this.body()?.nativeElement,
              el = inner?.parentElement;
            const pans = !!el && inner!.offsetHeight > el.clientHeight + 1;
            el?.classList.toggle('pans', pans);
            if (pans) el.setAttribute('tabindex', '0');
            else el?.removeAttribute('tabindex');
          })
        : null;
    effect(() => {
      const el = this.body()?.nativeElement;
      ro?.disconnect();
      if (el?.parentElement) {
        ro?.observe(el);
        ro?.observe(el.parentElement);
      }
    });
    inject(DestroyRef).onDestroy(() => {
      ro?.disconnect();
      this.clock.reset();
      clearTimeout(this.idleTimer);
      this.stats.release(this);
    });
  }

  protected running(): boolean {
    return this.isOpen() && !this.paused() && !this.held() && !this.sheet();
  }

  private start(): void {
    const os = reducedMotion();
    this.osReduced.set(os);
    this.still.set(os || this.prefs.still);
    this.paused.set(false);
    this.sheet.set(null);
    this.keys.set([]);
    this.isOpen.set(true);
    this.placed = this.screen.region() + '|' + this.pinned();
    const from = this.memo.key,
      lit = this.memo.lit;
    this.show(this.keyIndex(from ?? this.screen.region()));
    if (from !== null && lit >= 0 && this.walking()) this.light(lit, false);
    this.wake();
    afterNextRender(() => this.host.focus({ preventScroll: true }), { injector: this.injector });
  }
  private stop(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.clock.reset();
    clearTimeout(this.idleTimer);
    this.memo.clear();
    this.tabs.reset();
    this.sheet.set(null);
    this.view.slide.set(null);
  }


  protected toggle(pause = !this.paused()): void {
    if (this.pinned()) return;
    this.paused.set(pause);
    this.wake();
    this.say(pause ? tvf('tvPaused') : this.slideLabel(this.k(), true), true);
  }
  protected hold(on: boolean): void {
    this.held.set(on);
    if (!on) this.swallow = true;
  }
  protected tap(e: MouseEvent): void {
    const was = this.idle();
    this.wake();
    if (this.swallow) return void (this.swallow = false);
    const target = e.target as Element;
    if (
      was ||
      this.pinned() ||
      !target.closest('.tvf-frame') ||
      target.closest('a, button, input, select, dialog, [data-w], [tabindex="0"]')
    )
      return;
    const box = this.host.getBoundingClientRect();
    this.step(tapZone(e.clientX, box.left, box.width, true) === 'next' ? 1 : -1);
  }
  protected swipe(dir: 1 | -1): void {
    this.wake();
    if (!this.pinned()) this.step(dir);
  }
  protected close(): void {
    this.screen.leave('tv');
  }
  protected openSheet(s: TvfSheet): void {
    this.sheet.set(s);
    this.wake();
  }

  protected wake(): void {
    this.idle.set(false);
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      if (this.isOpen() && !this.paused() && !this.sheet()) this.idle.set(true);
    }, IDLE_MS);
  }

  protected onKey(e: KeyboardEvent): void {
    if (!this.isOpen() || this.sheet() || e.metaKey || e.ctrlKey || e.altKey) return;
    this.wake();
    const el = e.target as Element | null;
    const a = tvKey({
      key: e.key,
      keyCode: e.keyCode,
      onButton: !!el?.closest?.('button'),
      onField: !!el?.closest?.('select, input'),
    });
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button, [tabindex="0"]');
    if (a.type === 'wil') {
      if (this.stepWil(a.step)) e.preventDefault();
      return;
    }
    if (a.type === 'play' && this.pinned()) return;
    if (a.type !== 'play' || a.pause === undefined) e.preventDefault();
    if (a.type === 'close') this.close();
    else if (a.type === 'play') this.toggle(a.pause);
    else if (a.type === 'go') {
      const home = this.pinned() ? this.keyIndex(this.screen.region()) : 0;
      const to = {
        next: this.k() + 1,
        prev: this.k() - 1,
        first: home,
        last: this.keys().length - 1,
      };
      this.show(to[a.to], true);
    }
  }

  private walkWait(ms: number): void {
    if (this.comp() !== 'sign' || !this.walking()) return;
    this.clock.shift(this.clock.now(), ms);
    if (this.walkEnd !== null) this.walkEnd += ms;
    this.fill(this.walkLeft());
  }


  protected setStill(on: boolean): void {
    if (this.osReduced()) return;
    this.still.set(on);
    this.prefs.still = on;
    saveTvPrefs(this.prefs);
  }
}
