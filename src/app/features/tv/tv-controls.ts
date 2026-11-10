import { computed, ElementRef, inject, Injector, signal, WritableSignal } from '@angular/core';

import { TurnoutStore } from '../../data/turnout.store';

import { t } from '../../shared/ui/tv-strings';

import { reducedMotion } from '../../shared/motion/reduced-motion';
import { flushStyle } from '../../shared/motion/restart-animation';
import { SegItem } from '../../shared/ui/seg.component';

import { uid } from '../../shared/ui/uid';
import { ClockJob, SlideClock } from '../../shared/motion/slide-clock';

import { loadTvPrefs, saveTvPrefs, TV_SECS } from '../../shared/ui/tv-prefs';
import type { TvSlide } from './tv-slide.model';

import { tvKey } from './tv-keys';
import { slideLabel } from './tv-label';

import { trapTab } from '../../shared/ui/focus-trap';
import { ServerClock } from '../../core/clock/server-clock.service';
import { ScreenState } from '../../core/screen/screen.state';
interface Face {
  slides: TvSlide[];
  settled: boolean;
}
export const EMPTY_FACE: Face = { slides: [], settled: false };
const IDLE_MS = 4000;

export abstract class TvControls {
  protected readonly screen = inject(ScreenState);
  protected readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly injector = inject(Injector);
  protected readonly stats = inject(TurnoutStore);
  protected readonly serverClock = inject(ServerClock);
  protected readonly clock = new SlideClock();
  protected readonly prefs = loadTvPrefs();

  protected readonly isOpen = signal(false);
  protected readonly keys = signal<string[]>([]);
  protected readonly k = signal(0);
  protected readonly faces = [signal<Face>(EMPTY_FACE), signal<Face>(EMPTY_FACE)] as const;
  protected readonly active = signal<-1 | 0 | 1>(-1);
  protected readonly paused = signal(false);
  protected readonly still = signal(false);
  protected readonly osReduced = signal(false);
  protected readonly idle = signal(false);
  protected readonly secs = signal(this.prefs.sec);
  protected readonly announce = signal({ text: '', polite: false });
  protected readonly optsWidth = signal<string | null>(null);
  protected readonly hover = signal(false);
  protected readonly held = computed(() => this.isOpen() && !this.paused() && this.hover());
  protected readonly secValue = computed(() => String(this.secs()));
  protected readonly secItems: SegItem[] = TV_SECS.map((n) => ({
    v: String(n),
    label: t('tvSec', { n }),
  }));
  protected readonly timeLabelId = uid('tva');
  protected readonly region = this.screen.region;
  protected readonly pinned = computed(() => this.screen.rotation() === 'pinned');
  protected readonly regions = this.stats.govs;

  protected endJob: ClockJob | null = null;
  protected walkEnd: number | null = null;
  protected idleTimer?: ReturnType<typeof setTimeout>;
  protected opener: Element | null = null;
  protected hold(held: WritableSignal<boolean>, on: boolean): void {
    if (held() === on) return;
    held.set(on);
    this.syncClock();
  }

  protected setRegion(e: Event): void {
    this.screen.setRegion((e.target as HTMLSelectElement).value);
  }
  protected toggleRotation(): void {
    this.screen.setRotation(this.pinned() ? 'auto' : 'pinned');
  }

  protected syncClock(): void {
    if (this.isOpen() && !this.paused() && !this.hover()) this.clock.start();
    else this.clock.stop();
  }

  protected restartProgress(dur: number): void {
    const k = this.k();
    this.host.querySelectorAll<HTMLElement>('.tva-seg i').forEach((bar, i) => {
      bar.classList.remove('on');
      if (i !== k) return;
      flushStyle(bar);
      bar.style.setProperty('--dur', dur + 'ms');
      bar.classList.add('on');
    });
  }

  protected toggle(pause?: boolean): void {
    this.paused.set(pause ?? !this.paused());
    this.syncClock();
    this.wake();
    this.say(this.paused() ? t('tvPaused') : this.label(this.k(), true), true);
  }

  protected toggleStill(): void {
    if (reducedMotion()) return;
    this.still.update((s) => !s);
    this.prefs.still = this.still();
    saveTvPrefs(this.prefs);
    this.show(this.k(), true);
  }

  protected setSecs(v: string): void {
    const sec = Number(v);
    this.secs.set(sec);
    this.prefs.sec = sec;
    saveTvPrefs(this.prefs);
    if (this.walkEnd !== null) return;
    const f = this.active(),
      cur = f === -1 ? null : this.faces[f]().slides[0],
      dur = cur ? this.duration(cur) : sec * 1000;
    this.host
      .querySelector<HTMLElement>('.tva-seg[aria-current] i')
      ?.style.setProperty('--dur', dur + 'ms');
    if (this.endJob) this.clock.retime(this.endJob, dur);
  }


  protected label(k: number, full = false): string {
    return slideLabel({
      keys: this.keys(),
      k,
      gov: (id) => this.stats.gov(id),
      national: this.stats.national(),
      full,
    });
  }

  protected say(text: string, polite: boolean): void {
    this.announce.set({ text, polite });
  }


  protected wake(): void {
    this.idle.set(false);
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.fadeControls(), IDLE_MS);
  }
  protected fadeControls(): void {
    if (this.paused() || !this.isOpen()) return;
    const a = document.activeElement;
    if (a && a !== this.host && this.host.contains(a) && a.matches(':focus-visible')) return;
    this.idle.set(true);
    this.hover.set(false);
    this.syncClock();
  }

  protected onKey(e: KeyboardEvent): void {
    if (!this.isOpen() || e.metaKey || e.ctrlKey || e.altKey) return;
    this.wake();
    const el = e.target as Element | null;
    const a = tvKey({
      key: e.key,
      onButton: !!el?.closest?.('button'),
      onField: !!el?.closest?.('select, input'),
    });
    if (!a) return;
    if (a.type === 'tab') return trapTab(this.host, e, 'button, select, .tv-ih-rest');
    if (a.type === 'wil') {
      if (this.stepWil(a.step)) e.preventDefault();
      return;
    }
    if (a.type === 'play' && this.pinned()) return;
    if (a.type !== 'play' || a.pause === undefined) e.preventDefault();
    if (a.type === 'close') this.close();
    else if (a.type === 'play') this.toggle(a.pause);
    else if (a.type === 'go') {
      const k = this.k(),
        home = this.pinned() ? this.keyIndex(this.region()) : 0;
      const to = { next: k + 1, prev: k - 1, first: home, last: this.keys().length - 1 }[a.to];
      this.show(to, true);
    }
  }
  protected afterOpen(): void {
    const r = this.opener as HTMLElement | null,
      keyboard = !!r && r !== document.body && !!r.matches?.(':focus-visible');
    const first = this.pinned() ? '.tva-prev' : '.tva-play';
    ((keyboard && this.host.querySelector<HTMLElement>(first)) || this.host).focus({
      preventScroll: true,
    });
    const measure = () => {
      const w = this.host.querySelector<HTMLElement>('.tva-opts')?.offsetWidth;
      if (w) this.optsWidth.set(w + 'px');
    };
    measure();
    document.fonts?.ready.then(measure);
  }
  protected abstract show(k: number, user?: boolean): void;
  protected abstract keyIndex(key: string): number;
  protected abstract duration(slide: TvSlide): number;
  protected abstract stepWil(step: 1 | -1): boolean;
  protected close(): void {
    this.screen.leave('tv');
  }
}
