import { DOCUMENT, inject, Injectable } from '@angular/core';

export interface PollOptions {
  every: () => number;
  run: (signal: AbortSignal) => Promise<unknown>;
  while?: () => boolean;
  maxBackoff?: number;
  phase?: boolean;
}

export interface PollHost {
  hidden(): boolean;
  onVisible(fn: () => void): () => void;
  onWake(fn: () => void): () => void;
  random(): number;
}

const MIN_GAP = 1000,
  MAX_BACKOFF = 60 * 1000,
  JITTER = 0.2;

export class Poll {
  private on = false;
  private timer?: ReturnType<typeof setTimeout>;
  private ctl: AbortController | null = null;
  private failures = 0;
  private runs = 0;
  private due = false;
  private unlisten: (() => void)[] = [];

  constructor(
    private readonly opts: PollOptions,
    private readonly host: PollHost,
  ) {}

  get running(): boolean {
    return this.on;
  }

  start(): void {
    if (this.on) return;
    this.on = true;
    this.runs = 0;
    this.unlisten = [
      this.host.onVisible(() => this.returned()),
      this.host.onWake(() => this.woke()),
    ];
    this.fire();
  }

  stop(): void {
    this.on = false;
    this.due = false;
    clearTimeout(this.timer);
    this.ctl?.abort();
    this.ctl = null;
    this.unlisten.forEach((off) => off());
    this.unlisten = [];
  }

  refresh(): void {
    if (this.on) this.fire();
  }

  private woke(): void {
    this.failures = 0;
    this.refresh();
  }

  private returned(): void {
    if (!this.due) return;
    this.due = false;
    this.fire();
  }

  private fire(): void {
    clearTimeout(this.timer);
    if (!this.on) return;
    if (this.opts.while && !this.opts.while()) {
      this.stop();
      return;
    }
    if (this.host.hidden()) {
      this.due = true;
      return;
    }
    this.ctl?.abort();
    const ctl = (this.ctl = new AbortController()),
      t0 = performance.now();
    let ok = true;
    this.opts
      .run(ctl.signal)
      .catch(() => (ok = false))
      .then(() => {
        if (this.ctl !== ctl) return;
        this.ctl = null;
        this.failures = ok ? 0 : this.failures + 1;
        const wait =
          this.runs++ === 0 && ok && this.opts.phase
            ? this.host.random() * this.opts.every()
            : this.wait();
        this.timer = setTimeout(
          () => this.fire(),
          Math.max(MIN_GAP, wait - (performance.now() - t0)),
        );
      });
  }

  private wait(): number {
    const every = this.opts.every();
    if (!this.failures) return every;
    const cap = Math.max(every, this.opts.maxBackoff ?? MAX_BACKOFF),
      base = Math.min(cap, every * 2 ** (this.failures - 1));
    return base * (1 - JITTER + 2 * JITTER * this.host.random());
  }
}

@Injectable({ providedIn: 'root' })
export class PollScheduler {
  private readonly doc = inject(DOCUMENT);

  create(opts: PollOptions): Poll {
    const doc = this.doc;
    return new Poll(opts, {
      hidden: () => doc.visibilityState === 'hidden',
      onVisible: (fn) => {
        const on = () => {
          if (doc.visibilityState !== 'hidden') fn();
        };
        doc.addEventListener('visibilitychange', on);
        return () => doc.removeEventListener('visibilitychange', on);
      },
      onWake: (fn) => {
        const win = doc.defaultView,
          shown = (e: PageTransitionEvent) => {
            if (e.persisted) fn();
          };
        win?.addEventListener('online', fn);
        win?.addEventListener('pageshow', shown);
        return () => {
          win?.removeEventListener('online', fn);
          win?.removeEventListener('pageshow', shown);
        };
      },
      random: Math.random,
    });
  }
}
