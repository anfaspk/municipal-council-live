import { DOCUMENT, inject, signal } from '@angular/core';

export class StaleClock {
  private readonly _on = signal(false);
  readonly on = this._on.asReadonly();
  private timer?: ReturnType<typeof setTimeout>;
  private at: { mono: number; wall: number } | null = null;

  constructor(
    private readonly ms: number,
    running: () => boolean,
  ) {
    const doc = inject(DOCUMENT),
      win = doc.defaultView;
    const back = () => {
      if (running() && this.at && this.age(this.at) > this.ms) this._on.set(true);
    };
    win?.addEventListener('offline', () => {
      if (running()) this._on.set(true);
    });
    doc.addEventListener('visibilitychange', () => {
      if (doc.visibilityState === 'visible') back();
    });
    win?.addEventListener('pageshow', (e) => {
      if (e.persisted) back();
    });
  }

  arm(): void {
    this._on.set(false);
    this.at = { mono: performance.now(), wall: Date.now() };
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this._on.set(true), this.ms);
  }
  stop(): void {
    clearTimeout(this.timer);
    this.at = null;
  }

  private age(at: { mono: number; wall: number }): number {
    return Math.max(performance.now() - at.mono, Date.now() - at.wall);
  }
}
