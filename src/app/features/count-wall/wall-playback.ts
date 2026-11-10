import { reducedMotion } from '../../shared/motion/reduced-motion';
import { SlideClock } from '../../shared/motion/slide-clock';
import { COUNT_TV_PREFS, loadTvPrefs, saveTvPrefs } from '../../shared/ui/tv-prefs';

const HOLD_S = 20;

export interface PlaybackHost {
  tv(): HTMLElement | null;
  render(): void;
}

export class WallPlayback {
  readonly clock = new SlideClock();
  paused = false;
  private readonly pref = loadTvPrefs(COUNT_TV_PREFS);
  sec = this.pref.sec;
  still = false;
  hold: { hover?: boolean; manual?: boolean } = {};
  private idleT?: ReturnType<typeof setTimeout>;
  private holdT?: ReturnType<typeof setTimeout>;

  constructor(private readonly h: PlaybackHost) {}

  sync(): void {
    const tv = this.h.tv();
    if (!tv) return;
    const go = tv.classList.contains('on') && !this.paused && !this.hold.hover && !this.hold.manual;
    if (go) this.clock.start();
    else this.clock.stop();
    tv.classList.toggle('tva-paused', this.paused);
    tv.classList.toggle('tva-hold', !this.paused && !go);
    tv.classList.toggle('cx-held', !this.paused && !!this.hold.manual);
    this.h.render();
  }
  private holdFor(): void {
    clearTimeout(this.holdT);
    this.holdT = setTimeout(() => {
      this.hold.manual = false;
      this.sync();
    }, HOLD_S * 1000);
  }
  manualHold(): void {
    this.hold.manual = true;
    this.sync();
    this.holdFor();
  }
  release(): void {
    this.hold.manual = false;
    clearTimeout(this.holdT);
  }
  toggle(v?: boolean): void {
    this.paused = v == null ? !this.paused : !!v;
    if (!this.paused) this.release();
    this.sync();
    this.wake();
  }
  wake(): void {
    const tv = this.h.tv();
    if (!tv) return;
    tv.classList.remove('tva-idle');
    clearTimeout(this.idleT);
    if (this.hold.manual) this.holdFor();
    this.idleT = setTimeout(() => {
      if (this.paused || !tv.classList.contains('on')) return;
      const a = document.activeElement;
      if (a && a !== tv && tv.contains(a) && a.matches && a.matches(':focus-visible')) return;
      tv.classList.add('tva-idle');
      if (this.hold.hover) {
        this.hold.hover = false;
        this.sync();
      }
    }, 4000);
  }
  listen(tv: HTMLElement): void {
    tv.addEventListener('pointermove', (e) => {
      this.wake();
      const h = e.pointerType === 'mouse' && !!(e.target as Element).closest?.('.tva-dock');
      if (h !== !!this.hold.hover) {
        this.hold.hover = h;
        this.sync();
      }
    });
    tv.addEventListener('pointerleave', () => {
      if (this.hold.hover) {
        this.hold.hover = false;
        this.sync();
      }
    });
    tv.addEventListener('pointerdown', () => this.wake());
    tv.addEventListener('focusin', () => this.wake());
  }
  setSec(v: number): void {
    this.sec = v;
    saveTvPrefs({ ...this.pref, sec: this.sec }, COUNT_TV_PREFS);
  }
  toggleStill(): boolean {
    if (reducedMotion()) return false;
    this.still = this.pref.still = !this.still;
    saveTvPrefs({ ...this.pref, sec: this.sec }, COUNT_TV_PREFS);
    return true;
  }
  initStill(): void {
    this.still = reducedMotion() || !!this.pref.still;
  }
  reset(): void {
    this.clock.reset();
    clearTimeout(this.idleT);
  }
  destroy(): void {
    this.reset();
    clearTimeout(this.holdT);
  }
}
