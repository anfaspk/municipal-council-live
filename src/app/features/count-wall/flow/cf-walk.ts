import { computed, signal } from '@angular/core';
import { CGov } from '../../../domain/count/count';
import { type Place, walkFrom, walkSteps, type WalkStep } from './count-flow.model';

export class CfWalk {
  readonly on = signal(false);
  readonly paused = signal(false);
  readonly held = signal(false);
  private readonly steps = signal<WalkStep[]>([]);
  private readonly i = signal(0);
  private timer: ReturnType<typeof setTimeout> | undefined;
  private left = 0;
  private started = 0;

  constructor(private readonly show: (p: Place) => void) {}

  readonly step = computed(() => this.steps()[this.i()] ?? null);
  readonly segs = computed(() => {
    const l = this.steps(),
      i = this.i(),
      s = l[i];
    if (!s) return { n: 1, at: 0, ms: 0 };
    const gid = s.place.k === 'nat' ? null : s.place.gid;
    let a = i,
      b = i;
    const same = (k: number) => {
      const p = l[k]?.place;
      return !!p && (gid === null ? p.k === 'nat' : p.k !== 'nat' && p.gid === gid);
    };
    while (same(a - 1)) a--;
    while (same(b + 1)) b++;
    return { n: b - a + 1, at: i - a, ms: s.ms };
  });

  start(govs: readonly CGov[], sec: number, from: Place): void {
    const l = walkSteps(govs, sec);
    this.steps.set(l);
    this.i.set(walkFrom(l, from));
    this.on.set(true);
    this.paused.set(false);
    this.held.set(false);
    this.enter();
  }
  stop(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.on.set(false);
    this.paused.set(false);
    this.held.set(false);
  }
  toggle(pause = !this.paused()): void {
    if (!this.on()) return;
    this.paused.set(pause);
    this.sync();
  }
  hold(on: boolean): void {
    if (!this.on()) return;
    this.held.set(on);
    this.sync();
  }
  extend(ms: number): void {
    if (!this.on()) return;
    if (this.started) this.left = Math.max(0, this.left - (performance.now() - this.started));
    this.started = 0;
    this.left += ms;
    this.sync();
  }
  retime(govs: readonly CGov[], sec: number): void {
    const s = this.step();
    if (this.on() && s) this.start(govs, sec, s.place);
  }

  private enter(): void {
    const s = this.step();
    if (!s) return this.stop();
    this.show(s.place);
    this.left = s.ms;
    this.sync();
  }
  private sync(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    if (!this.on()) return;
    if (this.paused() || this.held()) {
      if (this.started) this.left = Math.max(0, this.left - (performance.now() - this.started));
      this.started = 0;
      return;
    }
    this.started = performance.now();
    this.timer = setTimeout(() => {
      this.started = 0;
      this.i.update((k) => (k + 1) % Math.max(1, this.steps().length));
      this.enter();
    }, this.left);
  }
}
