import { computed, inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '../api/api-client';
import { endpoints } from '../api/endpoints';
import { log } from '../log/log';
import { PollScheduler } from '../poll/poll-scheduler';
import { serverOffset } from './offset';

const OMAN_OFFSET = '+04:00';
const POLL = 10 * 1000,
  FAIL_OPEN = 30 * 1000;

const parseOman = (s: string): number => Date.parse(s.trim().replace(' ', 'T') + OMAN_OFFSET);
const opt = (s?: string | null): number | null => {
  if (!s) return null;
  const v = parseOman(s);
  return isNaN(v) ? null : v;
};

export type Phase = 'loading' | 'before' | 'live';

@Injectable({ providedIn: 'root' })
export class ServerClock {
  private readonly api = inject(ApiClient);
  private offset = Date.now() - performance.now();
  private readonly start = signal<number | null>(null);
  private readonly end = signal<number | null>(null);
  private readonly countStart = signal<number | null>(null);
  private readonly iFrom = signal<number | null>(null);
  private readonly iTo = signal<number | null>(null);
  private readonly failed = signal(false);
  private readonly clock = signal(performance.now());
  private readonly latched = signal(false);
  private readonly endLatched = signal(false);
  private readonly countLatched = signal(false);
  private timer?: ReturnType<typeof setTimeout>;

  readonly left = computed(() => {
    const s = this.start();
    return s === null ? null : s - (this.clock() + this.offset);
  });
  readonly votingStart = this.start.asReadonly();
  readonly votingEnd = this.end.asReadonly();
  readonly closed = this.endLatched.asReadonly();
  readonly counting = this.countLatched.asReadonly();
  readonly interimFrom = this.iFrom.asReadonly();
  readonly interimTo = this.iTo.asReadonly();
  readonly phase = computed<Phase>(() => {
    if (this.latched()) return 'live';
    const l = this.left();
    if (l === null) return 'loading';
    return l > 0 ? 'before' : 'live';
  });
  readonly connecting = computed(() => this.phase() === 'loading' && this.failed());

  constructor() {
    setTimeout(() => {
      if (this.start() === null) this.latched.set(true);
    }, FAIL_OPEN);
    inject(PollScheduler)
      .create({
        every: () => POLL,
        run: (signal) => this.load(signal),
        phase: true,
        while: () => !(this.latched() && this.endLatched() && this.countLatched()),
      })
      .start();
  }

  now(): number {
    return performance.now() + this.offset;
  }

  private async load(signal: AbortSignal): Promise<void> {
    try {
      const sent = performance.now(),
        d = await this.api.get(endpoints.electionDetail, { signal }),
        got = performance.now();
      const start = opt(d.gVS),
        server = opt(d.sT);
      if (start === null) throw new Error('no voting start');
      this.offset =
        server === null ? Date.now() - performance.now() : serverOffset(server, sent, got);
      this.clock.set(performance.now());
      this.start.set(start);
      this.end.set(opt(d.gVF));
      this.countStart.set(opt(d.vCS));
      this.iFrom.set(opt(d.iRF));
      this.iTo.set(opt(d.iRT));
      this.failed.set(false);
      this.advance();
    } catch (e) {
      log.warn('election/detail failed', e);
      this.failed.set(true);
      throw e;
    }
  }

  private advance(): void {
    clearTimeout(this.timer);
    const now = this.clock() + this.offset,
      e = this.end(),
      c = this.countStart();
    if (e !== null && e - now <= 0) this.endLatched.set(true);
    if (c !== null && c - now <= 0) this.countLatched.set(true);
    if (this.left()! <= 0) this.latched.set(true);
    const next = () => {
      this.clock.set(performance.now());
      this.advance();
    };
    if (!this.latched()) {
      const r = this.left()! % 1000;
      this.timer = setTimeout(next, (r === 0 ? 1000 : r) + 5);
      return;
    }
    const wait = [
      e !== null && !this.endLatched() ? e - now : null,
      c !== null && !this.countLatched() ? c - now : null,
    ].filter((x): x is number => x !== null);
    if (wait.length) this.timer = setTimeout(next, Math.min(Math.min(...wait), 60000) + 5);
  }
}
