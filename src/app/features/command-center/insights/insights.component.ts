import {
  afterNextRender,
  AfterViewInit,
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
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenUpdates } from '../../screens/screen-updates';
import { t } from '../../../core/i18n/i18n';
import { BootFlag } from '../../../shared/motion/boot';
import { IconComponent } from '../../../shared/ui/icon.component';
import { FrameHandle, FrameLoop } from '../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { flushStyle, restartAnimation } from '../../../shared/motion/restart-animation';
import { TPipe } from '../../../shared/ui/t.pipe';
import { uid } from '../../../shared/ui/uid';
import { name } from '../../../domain/format';
import { CommandCenterState } from '../command-center.state';
import { InsightsGenderComponent } from './insights-gender.component';
import { GenView, genView, Scope, WilView, wilView } from './insights.model';
import { InsightsWilayatComponent } from './insights-wilayat.component';

const SLIDES = [
  { k: 'gen', t: 'ixGenT', s: 'ixGenS', tag: 'live' },
  { k: 'wil', t: 'ixWilT', s: 'ixWilS', tag: 'live' },
] as const;
const SLIDE_COUNT = SLIDES.length,
  EVERY = 10000,
  EVERY_FILL: KeyframeAnimationOptions = { duration: EVERY, fill: 'forwards' };

@Component({
  selector: 'div.ixw',
  imports: [IconComponent, InsightsGenderComponent, InsightsWilayatComponent, TPipe],
  host: { class: 'ix' },
  templateUrl: './insights.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsComponent implements AfterViewInit {
  protected readonly stats = inject(TurnoutStore);
  private readonly updates = inject(ScreenUpdates);
  protected readonly slides = SLIDES;
  protected readonly u = uid('ix');
  protected readonly name = name;
  protected readonly scopeId = signal('all');
  protected readonly scopeGov = computed(() => {
    const id = this.scopeId();
    return id !== 'all' ? this.stats.gov(id) : null;
  });
  protected readonly scopeName = computed(() => {
    const g = this.scopeGov();
    return g ? name(g) : t('ixOman');
  });
  private readonly state = inject(CommandCenterState);
  protected readonly paused = this.state.held;
  protected readonly ppLabel = computed(() => t(this.paused() ? 'ixPlay' : 'ixPause'));
  protected readonly gen = signal<GenView | null>(null);
  protected readonly wil = signal<WilView | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly animate = inject(BootFlag).first;
  private readonly scopeEl = viewChild.required<ElementRef<HTMLElement>>('scope');
  private readonly srEl = viewChild.required<ElementRef<HTMLElement>>('sr');
  private readonly wilSlide = viewChild(InsightsWilayatComponent);
  private base = this.stats.national().voted;
  private ready = false;
  private cur = 0;
  private busy = false;
  private dead = false;
  private clock: FrameHandle | null = null;
  private ro?: ResizeObserver;
  private onVis = () => this.sync();
  private bar: Animation | null = null;
  private covered = false;
  private hover = false;
  private focusIn = false;
  private swapT?: ReturnType<typeof setTimeout> | undefined;
  private inkK = -1;
  private readonly bT: Record<number, ReturnType<typeof setTimeout>> = {};
  private slideEls!: NodeListOf<HTMLElement>;
  private titleEls!: NodeListOf<HTMLElement>;
  private tabEls!: NodeListOf<HTMLElement>;
  private dock!: HTMLElement;

  constructor() {
    effect(() => {
      const g = this.state.side();
      untracked(() => {
        if (this.ready) this.setGov(g);
      });
    });
    this.destroyRef.onDestroy(() => {
      this.dead = true;
      this.ro?.disconnect();
      this.clock?.stop();
      this.bar?.cancel();
      clearTimeout(this.swapT);
      document.removeEventListener('visibilitychange', this.onVis);
    });
  }

  protected tag = (k: string) => t(k).toUpperCase();
  protected slideLabel = (i: number) => t('ixOf', { i: i + 1, n: SLIDE_COUNT, t: t(SLIDES[i]!.t) });

  ngAfterViewInit(): void {
    const el = this.el;
    this.slideEls = el.querySelectorAll('.ix-slide');
    this.titleEls = el.querySelectorAll('.ix-tt');
    this.tabEls = el.querySelectorAll('.ix-tab');
    this.dock = el.querySelector('.ix-dock')!;
    const card = el.closest('.mj-glass') || el;
    card.addEventListener('pointerenter', () => {
      this.hover = true;
      this.sync();
    });
    card.addEventListener('pointerleave', () => {
      this.hover = false;
      this.sync();
    });
    el.addEventListener('focusin', () => {
      this.focusIn = true;
      this.sync();
    });
    el.addEventListener('focusout', (e) => {
      if (!el.contains((e as FocusEvent).relatedTarget as Node)) {
        this.focusIn = false;
        this.sync();
      }
    });
    document.addEventListener('visibilitychange', this.onVis);
    this.ro = new ResizeObserver(() => {
      if (this.inkK >= 0) this.ink(this.inkK, true);
    });
    this.ro.observe(this.dock);
    this.ready = true;
    this.updates.side.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (e.type === 'pull' || e.type === 'resume') this.update(this.stats.national().voted);
    });

    this.frames.once({
      write: () => {
        if (this.dead) return;
        this.take(0);
        this.rendered(() => {
          if (this.animate) this.buildIn(0);
          this.ink(0, true);
          if (!this.animate) this.slideEls[0]!.classList.add('ix-still');
          this.covered = this.frames.isPaused('dashboard');
          this.clock = this.frames.add(
            {
              paused: () => {
                this.covered = true;
                this.sync();
              },
              resumed: () => {
                this.covered = false;
                this.sync();
              },
            },
            'dashboard',
          );
          this.startClock();
        });
      },
    });
  }

  private scope(): Scope {
    const n = this.stats.national(),
      id = this.scopeId(),
      g = id !== 'all' ? this.stats.gov(id) : null;
    return g
      ? { g, total: g.voted, m: g.votedM, f: g.votedF, hours: g.hours }
      : { g: null, total: this.base, m: n.votedM, f: n.votedF, hours: n.hours };
  }
  private take(i: number): void {
    if (SLIDES[i]!.k === 'gen') this.gen.set(genView(this.scope()));
    else this.wil.set(wilView(this.scope(), this.stats.govs()));
  }
  private taken(i: number): boolean {
    return (SLIDES[i]!.k === 'gen' ? this.gen() : this.wil()) !== null;
  }
  private rendered(fn: () => void): void {
    afterNextRender(
      () => {
        if (!this.dead) fn();
      },
      { injector: this.injector },
    );
  }

  private buildIn(i: number): void {
    const slide = this.slideEls[i]!;
    slide.classList.remove('ix-build', 'ix-still');
    flushStyle(slide);
    slide.classList.add(reducedMotion() ? 'ix-still' : 'ix-build');
    clearTimeout(this.bT[i]);
    this.bT[i] = setTimeout(() => slide.classList.remove('ix-build'), 2600);
    if (SLIDES[i]!.k === 'wil' && !reducedMotion()) this.wilSlide()?.countUp();
  }

  private ink(k: number, instant?: boolean): void {
    const dock = this.dock,
      tb = this.tabEls[k]!,
      ink0 = dock.querySelector<HTMLElement>('.ix-ink')!,
      d0 = dock.querySelector<HTMLElement>('.ix-drop.d1')!,
      d1 = dock.querySelector<HTMLElement>('.ix-drop.d2')!;
    const Wd = dock.clientWidth,
      l = tb.offsetLeft,
      w = tb.offsetWidth,
      r = Wd - l - w,
      cx = l + w / 2;
    const prev = this.inkK < 0 ? null : this.tabEls[this.inkK],
      right = prev ? tb.offsetLeft > prev.offsetLeft : true;
    const all = [ink0, d0, d1];
    if (instant || reducedMotion() || !prev)
      all.forEach((e) => {
        e.style.transition = 'none';
      });
    else {
      ink0.style.transition =
        'left .62s cubic-bezier(.7,0,.25,1) ' +
        (right ? '.14s' : '0s') +
        ',right .62s cubic-bezier(.7,0,.25,1) ' +
        (right ? '0s' : '.14s');
      d0.style.transition = 'left .8s cubic-bezier(.6,0,.2,1) .06s';
      d1.style.transition = 'left .95s cubic-bezier(.6,0,.2,1) .12s';
    }
    ink0.style.left = l + 'px';
    ink0.style.right = r + 'px';
    d0.style.left = cx - 7 + 'px';
    d1.style.left = cx - 5 + 'px';
    if (instant || !prev) {
      flushStyle(ink0);
      all.forEach((e) => {
        e.style.transition = '';
      });
    }
    this.inkK = k;
  }

  protected tabClick(e: Event): void {
    const tb = (e.target as Element).closest('.ix-tab');
    if (tb) this.go(Array.prototype.indexOf.call(this.tabEls, tb), true);
  }
  protected tabKey(e: KeyboardEvent): void {
    const rtl = getComputedStyle(this.el).direction === 'rtl',
      cur = this.cur;
    let k = cur;
    if (e.key === 'ArrowRight') k = cur + (rtl ? -1 : 1);
    else if (e.key === 'ArrowLeft') k = cur + (rtl ? 1 : -1);
    else if (e.key === 'Home') k = 0;
    else if (e.key === 'End') k = SLIDE_COUNT - 1;
    else return;
    e.preventDefault();
    this.go(k, true);
    this.tabEls[this.cur]!.focus();
  }
  protected pick(e: Event): void {
    const v = (e.target as HTMLSelectElement).value;
    this.setGov(v === 'all' ? null : v);
  }
  protected togglePause(): void {
    this.paused.set(!this.paused());
    this.sync();
    this.srEl().nativeElement.textContent = t(this.paused() ? 'ixPausedSr' : 'ixPlay');
  }

  private go(k: number, user: boolean): void {
    k = ((k % SLIDE_COUNT) + SLIDE_COUNT) % SLIDE_COUNT;
    if (k === this.cur) return;
    const from = this.cur;
    this.cur = k;
    this.take(k);
    this.rendered(() => this.swap(from, k, user));
  }
  private swap(from: number, k: number, user: boolean): void {
    if (this.swapT !== undefined) {
      clearTimeout(this.swapT);
      this.swapT = undefined;
      this.finish();
    }
    const a = this.slideEls[from]!,
      b = this.slideEls[k]!;
    this.titleEls.forEach((tt, i) => {
      tt.classList.toggle('was', i === from);
      tt.classList.toggle('on', i === k);
    });
    this.tabEls.forEach((tb, i) => {
      tb.classList.toggle('on', i === k);
      tb.setAttribute('aria-selected', String(i === k));
      tb.tabIndex = i === k ? 0 : -1;
    });
    this.ink(k);
    this.buildIn(k);
    b.removeAttribute('inert');
    b.removeAttribute('aria-hidden');
    a.setAttribute('inert', '');
    a.setAttribute('aria-hidden', 'true');
    if (user) this.srEl().nativeElement.textContent = this.slideLabel(k);
    a.classList.remove('on');
    b.classList.add('on');
    if (!reducedMotion()) {
      this.busy = true;
      this.swapT = setTimeout(() => {
        this.swapT = undefined;
        this.finish();
      }, 1250);
    }
    this.startClock();
  }
  private finish(): void {
    this.busy = false;
    this.slideEls.forEach((s, i) => s.classList.toggle('on', i === this.cur));
    this.titleEls.forEach((tt) => tt.classList.remove('was'));
    this.sync();
  }

  private running(): boolean {
    return (
      !this.paused() &&
      !this.hover &&
      !this.focusIn &&
      !this.busy &&
      !this.covered &&
      !document.hidden
    );
  }
  private startClock(): void {
    this.bar?.cancel();
    const prog = this.tabEls[this.cur]!.querySelector('.ix-prog b')!,
      bar = prog.animate([{ transform: 'scaleX(0)' }, { transform: 'none' }], EVERY_FILL);
    bar.onfinish = () => {
      if (bar === this.bar && !this.dead) this.go(this.cur + 1, false);
    };
    this.bar = bar;
    this.sync();
  }
  private sync(): void {
    const bar = this.bar;
    if (this.dead || !bar) return;
    const run = this.running();
    this.el.classList.toggle('ix-held', !run && !this.busy);
    if (run && bar.playState === 'paused') bar.play();
    else if (!run && bar.playState === 'running') {
      const at = bar.currentTime;
      bar.pause();
      bar.currentTime = at;
    }
  }

  private setGov(id: string | null): void {
    const v = id || 'all';
    if (v === this.scopeId()) return;
    this.scopeId.set(v);
    if (!reducedMotion()) restartAnimation(this.scopeEl().nativeElement, 'ix-pop');
    this.take(this.cur);
  }
  private update(total: number): void {
    this.base = total;
    if (this.taken(this.cur)) this.take(this.cur);
  }
}
