import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  untracked,
  viewChildren,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ScreenUpdates } from '../screens/screen-updates';

import { guard } from '../../core/log/log';
import { HorizonComponent } from '../../shared/ui/horizon.component';
import { IconComponent } from '../../shared/ui/icon.component';
import { LatticeComponent } from '../../shared/ui/lattice.component';
import { FRAME_SCOPE } from '../../shared/motion/frame-loop.service';
import { ClockJob } from '../../shared/motion/slide-clock';
import { reducedMotion } from '../../shared/motion/reduced-motion';

import { SegComponent } from '../../shared/ui/seg.component';
import { TvTPipe as TPipe } from '../../shared/ui/tv-t.pipe';

import { TvSlideComponent } from './slide/tv-slide.component';

import type { GovSlide, TvSlide } from './tv-slide.model';
import { buildSlide, refreshSlide, slideKeys, SPLIT_GOV } from './tv-slide.model';

import { watchTvPointer } from './tv-pointer';

import { TvControls, EMPTY_FACE } from './tv-controls';
import { InterimStore } from '../../data/interim.store';
import { TvInterimTab } from './tv-interim-tab';
import { INT_FROM, INT_STEP, interimDuration } from './tv-interim.model';
@Component({
  selector: 'div.mj-tv',
  imports: [
    HorizonComponent,
    LatticeComponent,
    IconComponent,
    SegComponent,
    TPipe,
    TvSlideComponent,
  ],
  providers: [TvInterimTab, { provide: FRAME_SCOPE, useValue: 'tv' }],
  host: {
    tabindex: '-1',
    '[class.on]': 'isOpen()',
    '[class.tva-still]': 'still()',
    '[class.tva-paused]': 'paused()',
    '[class.tva-hold]': 'held()',
    '[class.tva-idle]': 'idle()',
    '[class.tva-pinned]': 'pinned()',
    '[style.--tva-ow]': 'optsWidth()',
    '(document:keydown)': 'onKey($event)',
    '(click)': 'pick($event)',
  },
  templateUrl: './tv.component.html',
  styleUrls: ['./tv.scss', './tv-slides.scss', './tv-interim.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvComponent extends TvControls {
  private readonly updates = inject(ScreenUpdates);
  private readonly slideViews = viewChildren(TvSlideComponent);
  private readonly interim = inject(InterimStore);
  private readonly inter = computed(() => this.interim.phase() === 'open');
  private placed = '';
  private shownInter = false;
  private walkJobs: ClockJob[] = [];

  constructor() {
    super();
    watchTvPointer(this.host, {
      wake: () => this.wake(),
      dock: (over) => this.hold(this.hover, over),
    });
    this.updates.tv.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.type === 'pull' || e.type === 'resume') guard('tv refresh', () => this.refresh());
    });
    effect(() => {
      const r = this.region(),
        at = r + '|' + this.pinned();
      untracked(() => {
        if (!this.isOpen() || at === this.placed) return;
        this.placed = at;
        if (this.pinned()) this.paused.set(false);
        this.show(this.keyIndex(r), true);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.clock.reset();
      clearTimeout(this.idleTimer);
    });
    effect(() => this.interim.watch(this.isOpen()));
    const tab = inject(TvInterimTab).tab;
    let open = false;
    effect(() => {
      const now = this.inter();
      untracked(() => {
        if (now && !open) tab.set('inter');
        if (this.isOpen() && this.keys().length && now !== this.shownInter) this.show(this.k());
      });
      open = now;
    });
    effect(() => {
      const on = this.screen.is('tv');
      untracked(() => (on ? this.start() : this.stop()));
    });
  }

  private start(): void {
    const os = reducedMotion();
    this.opener = document.activeElement;
    this.faces.forEach((f) => f.set(EMPTY_FACE));
    this.active.set(-1);
    this.k.set(0);
    this.keys.set([]);
    this.paused.set(false);
    this.hover.set(false);
    this.idle.set(false);
    this.osReduced.set(os);
    this.still.set(os || this.prefs.still);
    this.isOpen.set(true);
    this.placed = this.region() + '|' + this.pinned();
    this.show(this.keyIndex(this.region()));
    this.wake();
    afterNextRender(() => this.afterOpen(), { injector: this.injector });
  }
  private stop(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.clock.reset();
    clearTimeout(this.idleTimer);
    this.opener = null;
  }


  protected show(k: number, user = false): void {
    if (!this.isOpen()) return;
    const index = this.stats.index(),
      old = this.keys(),
      want = old.length ? old[mod(k, old.length)]! : null;
    if (!old.length || k === 0 || this.pinned()) this.keys.set(slideKeys(index));
    const keys = this.keys(),
      idx = want === null ? mod(k, keys.length) : Math.max(0, keys.indexOf(want));
    const seg = document.activeElement?.classList.contains('tva-seg') ?? false;
    const settled = this.paused(),
      face = this.active() === 0 ? 1 : 0;
    const slide = this.unpinned(
      buildSlide(keys, idx, index, this.stats.national(), this.stats.done()),
    );
    this.shownInter = this.inter();
    const walk = this.shownInter && slide.kind === 'gov' ? slide : null;
    const dur = this.duration(slide);

    this.clock.reset();
    this.walkJobs = [];
    this.walkEnd = null;
    this.k.set(idx);
    this.faces[face].set({ slides: [slide], settled });
    this.active.set(face);
    this.updates.tvSwap(this.host.querySelectorAll('.tv-face')[face]);
    afterNextRender(
      () => {
        if (!settled && !this.still()) this.slideView(slide)?.countUp('show');
        this.restartProgress(dur);
        if (seg)
          this.host
            .querySelector<HTMLElement>('.tva-seg[aria-current]')
            ?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
    if (slide.kind === 'gov' && !settled) this.splitTimers(slide, dur, !walk);
    this.endJob = this.pinned() ? null : this.clock.at(dur, () => this.show(this.k() + 1));
    if (walk) {
      if (settled)
        afterNextRender(() => this.slideView(walk)?.spotlight(0), { injector: this.injector });
      this.walk(walk, 0, INT_FROM);
    }
    this.say(this.label(idx, true), user || settled);
    this.syncClock();
  }

  private splitTimers(slide: GovSlide, dur: number, spot: boolean): void {
    const sp = SPLIT_GOV * 1000,
      view = () => this.slideView(slide);
    if (!this.still()) {
      this.clock.at(sp + 300, () => view()?.countUp('table'));
      this.clock.at(sp + 1300, () => view()?.countUp('labels'));
    }
    const n = slide.wilayat.length;
    if (!spot || this.still() || reducedMotion() || !n) return;
    const every = Math.max(900, Math.min(1600, (dur - sp - 3400) / (n + 1)));
    for (let i = 0; i <= n; i++)
      this.clock.at(sp + 2600 + i * every, () => view()?.spotlight(i < n ? i : -1));
  }

  private walk(slide: GovSlide, from: number, at: number): void {
    this.walkJobs.forEach((j) => this.clock.cancel(j));
    const n = slide.wilayat.length,
      view = () => this.slideView(slide);
    this.walkJobs = [];
    for (let i = from; i < n; i++)
      this.walkJobs.push(this.clock.at(at + (i - from) * INT_STEP, () => view()?.spotlight(i)));
    const end = at + Math.max(1, n - from) * INT_STEP;
    this.walkEnd = end;
    if (this.endJob) {
      this.clock.retime(this.endJob, end);
      this.host
        .querySelector<HTMLElement>('.tva-seg[aria-current] i')
        ?.style.setProperty('--dur', end + 'ms');
    } else if (this.pinned())
      this.walkJobs.push(this.clock.at(end, () => this.walk(slide, 0, end)));
  }

  protected pick(e: MouseEvent): void {
    const el = e.target instanceof Element ? e.target.closest('[data-w]') : null;
    if (el?.closest('.tv-face.on')) this.light(Number(el.getAttribute('data-w')));
  }
  protected stepWil(step: 1 | -1): boolean {
    const cur = this.walking(),
      n = cur?.slide.wilayat.length ?? 0;
    if (!cur || !n) return false;
    this.light((Math.max(0, cur.view.lit()) + step + n) % n);
    return true;
  }
  private light(i: number): void {
    const cur = this.walking(),
      w = cur?.slide.wilayat[i];
    if (!cur || !w) return;
    cur.view.spotlight(i);
    this.walk(cur.slide, i + 1, this.clock.now() + INT_STEP);
    this.say(w.name, true);
  }
  private walking(): { slide: GovSlide; view: TvSlideComponent } | null {
    const f = this.active(),
      slide = f === -1 ? null : this.faces[f]().slides[0],
      view = slide && this.slideView(slide);
    return this.shownInter && slide?.kind === 'gov' && view ? { slide, view } : null;
  }

  private unpinned<S extends TvSlide>(slide: S): S {
    return this.pinned() ? { ...slide, next: null } : slide;
  }
  protected keyIndex(key: string): number {
    const keys = this.keys().length ? this.keys() : slideKeys(this.stats.index());
    return Math.max(0, keys.indexOf(key));
  }

  private refresh(): void {
    const f = this.active(),
      face = f === -1 ? null : this.faces[f](),
      cur = face?.slides[0];
    if (!this.isOpen() || f === -1 || !face || !cur) return;
    const keys = this.keys(),
      idx = keys.indexOf(cur.key);
    if (idx < 0) return;
    const st = this.stats,
      next = buildSlide(keys, idx, st.index(), st.national(), st.done());
    this.slideView(cur)?.live(!face.settled && !this.still());
    this.faces[f].set({ ...face, slides: [this.unpinned(refreshSlide(cur, next))] });
  }

  protected duration(slide: TvSlide): number {
    return slide.kind === 'gov' && this.inter()
      ? interimDuration(slide.wilayat.length)
      : this.secs() * 1000;
  }

  private slideView(slide: TvSlide): TvSlideComponent | undefined {
    return this.slideViews().find((v) => v.slide().uid === slide.uid);
  }
}
const mod = (k: number, n: number): number => ((k % n) + n) % n;
