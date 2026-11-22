import { computed, inject, signal } from '@angular/core';
import { InterimStore } from '../../../data/interim.store';
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenState } from '../../../core/screen/screen.state';
import { ClockJob } from '../../../shared/motion/slide-clock';
import { loadTvPrefs, saveTvPrefs } from '../../../shared/ui/tv-prefs';
import { TvInterimTab } from '../tv-interim-tab';
import { INT_FROM, INT_STEP, interimDuration } from '../tv-interim.model';
import { slideLabel } from '../tv-label';
import { TvMemo } from '../tv-memo';
import { buildSlide, slideKeys, type TvSlide } from '../tv-slide.model';
import { TvView } from '../tv.view';
import { TvWalk } from '../tv-walk';
import { PHONE_COUNTRY, PHONE_REGION, storyStep } from './tv-flow.model';

export const mod = (k: number, n: number): number => ((k % n) + n) % n;

export abstract class TvfPlayer {
  protected readonly view = inject(TvView);
  protected readonly screen = inject(ScreenState);
  protected readonly stats = inject(TurnoutStore);
  protected readonly interim = inject(InterimStore);
  protected readonly memo = inject(TvMemo);
  protected readonly walker = inject(TvWalk);
  protected readonly clock = this.walker.clock;
  protected readonly prefs = loadTvPrefs();
  protected readonly tabs = inject(TvInterimTab);
  protected readonly tab = this.tabs.tab;

  protected readonly isOpen = signal(false);
  protected readonly keys = signal<string[]>([]);
  protected readonly k = signal(0);
  protected readonly paused = signal(false);
  protected readonly secs = signal(this.prefs.sec);
  protected readonly announce = signal({ text: '', polite: false });
  protected readonly pinned = computed(() => this.screen.rotation() === 'pinned');
  protected readonly inter = computed(() => this.interim.phase() === 'open');
  protected readonly stays = computed(
    () => this.pinned() || (this.inter() && this.screen.region() !== 'nat'),
  );
  protected readonly walking = signal(false);
  protected readonly segMs = signal(0);
  protected readonly segRound = signal(0);

  protected placed = '';
  protected endJob: ClockJob | null = null;
  protected walkJobs: ClockJob[] = [];
  protected walkEnd: number | null = null;

  protected show(k: number, user = false): void {
    if (!this.isOpen()) return;
    const index = this.stats.index(),
      old = this.keys(),
      want = old.length ? old[mod(k, old.length)]! : null;
    if (!old.length || k === 0 || this.pinned()) this.keys.set(slideKeys(index));
    const keys = this.keys(),
      idx = want === null ? mod(k, keys.length) : Math.max(0, keys.indexOf(want));
    const slide = this.build(keys, idx);
    this.clock.reset();
    this.walkJobs = [];
    this.walkEnd = null;
    this.k.set(idx);
    this.view.slide.set(slide);
    this.view.spot.set(-1);
    if (user && slide.key !== this.memo.key) this.follow(slide.key);
    this.memo.keep(slide.key);
    this.walker.onView.set(slide.uid);
    this.walker.shown.update((n) => n + 1);
    const walk = this.inter() && slide.kind === 'gov';
    this.walking.set(walk);
    const dur = this.duration(slide);
    this.endJob = this.stays() ? null : this.clock.at(dur, () => this.show(this.k() + 1));
    if (walk) this.walk(slide.wilayat.length, 0, INT_FROM);
    else this.fill(dur);
    this.say(this.slideLabel(idx, true), user);
    if (this.running()) this.clock.start();
  }
  private follow(key: string): void {
    if (this.pinned()) return;
    this.placed = key + '|false';
    this.screen.setRegion(key);
  }
  protected abstract running(): boolean;
  protected build(keys: string[], idx: number): TvSlide {
    const st = this.stats;
    return buildSlide(keys, idx, st.index(), st.national(), st.done(), {
      region: PHONE_REGION,
      country: PHONE_COUNTRY,
    });
  }

  protected walk(n: number, from: number, at: number): void {
    this.walkJobs.forEach((j) => this.clock.cancel(j));
    this.walkJobs = [];
    for (let i = from; i < n; i++)
      this.walkJobs.push(this.clock.at(at + (i - from) * INT_STEP, () => this.spotTo(i)));
    const end = at + Math.max(1, n - from) * INT_STEP;
    this.walkEnd = end;
    if (this.endJob) this.clock.retime(this.endJob, end);
    else if (this.stays()) this.walkJobs.push(this.clock.at(end, () => this.walk(n, 0, end)));
    const until = from === 0 ? (n > 1 ? at + INT_STEP : end) : from < n ? at : end;
    this.fill(Math.max(0, until - this.clock.now()));
  }
  protected spotTo(i: number): void {
    const was = Math.max(0, this.view.spot());
    this.view.spot.set(i);
    this.memo.lit = i;
    if (i !== was) this.fill(INT_STEP);
  }
  protected light(i: number, say = true): void {
    const g = this.view.gov(),
      w = g?.wilayat[i];
    if (!g || !w || !this.walking()) return;
    this.view.spot.set(i);
    this.memo.lit = i;
    this.walk(g.wilayat.length, i + 1, this.clock.now() + INT_STEP);
    if (say) this.say(w.name, true);
  }
  protected fill(ms: number): void {
    this.segMs.set(ms);
    this.segRound.update((r) => r + 1);
  }

  protected step(dir: 1 | -1): void {
    const g = this.view.gov(),
      walk = this.walking() && g ? { n: g.wilayat.length, lit: this.view.spot() } : null,
      to = storyStep(this.k(), walk, dir);
    if (to.to === 'wil') this.light(to.i);
    else this.show(to.k, true);
  }
  protected stepWil(dir: 1 | -1): boolean {
    const g = this.view.gov(),
      n = g?.wilayat.length ?? 0;
    if (!this.walking() || !n) return false;
    this.light((Math.max(0, this.view.spot()) + dir + n) % n);
    return true;
  }

  protected refresh(): void {
    const cur = this.view.slide();
    if (!this.isOpen() || !cur) return;
    const idx = this.keys().indexOf(cur.key);
    if (idx < 0) return;
    const next = this.build(this.keys(), idx);
    if (this.walking() && cur.kind === 'gov' && !cur.wilayat.length && next.kind === 'gov')
      if (next.wilayat.length) return this.show(idx);
    this.view.slide.set({ ...next, uid: cur.uid });
  }

  protected duration(slide: TvSlide): number {
    return slide.kind === 'gov' && this.inter()
      ? interimDuration(slide.wilayat.length)
      : this.secs() * 1000;
  }
  protected keyIndex(key: string): number {
    const keys = this.keys().length ? this.keys() : slideKeys(this.stats.index());
    return Math.max(0, keys.indexOf(key));
  }
  protected slideLabel(k: number, full = false): string {
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

  protected setSecs(sec: number): void {
    this.secs.set(sec);
    this.prefs.sec = sec;
    saveTvPrefs(this.prefs);
    const cur = this.view.slide();
    if (this.walkEnd !== null || !cur || !this.endJob) return;
    this.clock.retime(this.endJob, this.duration(cur));
    this.fill(Math.max(0, this.duration(cur) - this.clock.now()));
  }
}
