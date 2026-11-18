import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { log } from '../core/log/log';
import { Poll, PollScheduler } from '../core/poll/poll-scheduler';
import { clockStr } from '../domain/format';
import { regionName, regionWils } from '../domain/places/places';
import { checkWinners } from '../domain/validate/winners-answers';
import { allAnnounced, announcedOf, regionOf, winnersOf, WRegion } from '../domain/winners/winners';
import { IssueLog } from './issue-log';

const EVERY = 60 * 1000;
const STALE_POLLS = 2;

export type WinnersLoad = 'idle' | 'wait' | 'loading' | 'ready' | 'failed';

interface Entry {
  answer: WRegion;
  at: number;
}

@Injectable({ providedIn: 'root' })
export class WinnersStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly polls = inject(PollScheduler);
  private readonly issueLog = new IssueLog('winners');

  private readonly _region = signal<number | null>(null);
  private readonly cache = signal<ReadonlyMap<number, Entry>>(new Map());
  private readonly fails = signal(0);
  private poll: Poll | null = null;
  private last: WRegion | null = null;

  readonly region = this._region.asReadonly();
  readonly data = computed<WRegion | null>(() => {
    const id = this._region();
    if (id === null) return (this.last = null);
    const read = new Map((this.cache().get(id)?.answer.wils ?? []).map((w) => [w.id, w]));
    const prev = this.last?.id === id ? this.last : null;
    return (this.last = regionOf(id, regionName(id), regionWils(id), read, prev));
  });
  readonly announced = computed(() => announcedOf(this.data()));
  readonly summaries = computed(() => {
    const out = new Map<number, { done: number; all: number }>();
    for (const [gov, e] of this.cache()) {
      const ann = new Set(e.answer.wils.filter((w) => w.published).map((w) => w.id)),
        wils = regionWils(gov);
      if (wils.length)
        out.set(gov, { done: wils.filter((w) => ann.has(w.id)).length, all: wils.length });
    }
    return out;
  });
  readonly done = computed(() => allAnnounced(this.data()));
  readonly load = computed<WinnersLoad>(() => {
    const id = this._region();
    if (id === null) return 'idle';
    if (!this.clock.counting()) return 'wait';
    if (this.cache().has(id)) return 'ready';
    return this.fails() ? 'failed' : 'loading';
  });
  readonly updatedAt = computed(() => {
    const id = this._region(),
      e = id === null ? undefined : this.cache().get(id);
    return e ? clockStr(e.at) : null;
  });
  readonly stale = computed(() => {
    const id = this._region();
    return id !== null && this.cache().has(id) && !this.final(id) && this.fails() >= STALE_POLLS;
  });

  constructor() {
    effect(() => {
      if (this.clock.counting()) untracked(() => this.restart());
    });
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  watch(id: number | null): void {
    if (id === this._region()) return;
    this._region.set(id);
    this.restart();
  }

  retry(): void {
    this.fails.set(0);
    if (this.poll?.running) this.poll.refresh();
    else this.restart();
  }

  private stop(): void {
    this.poll?.stop();
    this.poll = null;
  }

  private final(gov: number): boolean {
    const e = this.cache().get(gov),
      wils = regionWils(gov);
    if (!e || !wils.length) return false;
    const ann = new Set(e.answer.wils.filter((w) => w.published).map((w) => w.id));
    return wils.every((w) => ann.has(w.id));
  }

  private restart(): void {
    this.stop();
    this.fails.set(0);
    const gov = this._region();
    if (gov !== null && this.clock.counting() && !this.final(gov)) this.poll = this.pollGov(gov);
  }

  private pollGov(gov: number): Poll {
    const poll = this.polls.create({
      every: () => {
        const e = this.cache().get(gov);
        return e ? Math.max(1000, EVERY - (this.clock.now() - e.at)) : EVERY;
      },
      run: async (signal) => {
        const e = this.cache().get(gov);
        if (e && this.clock.now() - e.at < EVERY) return;
        try {
          await this.fetch(gov, signal);
          if (this._region() === gov) this.fails.set(0);
        } catch (err) {
          if (signal.aborted) return;
          if (this._region() === gov) this.fails.update((n) => n + 1);
          throw err;
        }
      },
      while: () => this._region() === gov && !this.final(gov),
    });
    poll.start();
    return poll;
  }

  private async fetch(gov: number, signal: AbortSignal): Promise<void> {
    try {
      const r = await this.api.get(endpoints.winners(gov, 0), { signal });
      if (signal.aborted) return;
      const { value, issues } = checkWinners(gov, r);
      this.issueLog.report(issues);
      const answer = winnersOf(value, this.cache().get(gov)?.answer ?? null);
      this.cache.update((m) => new Map(m).set(gov, { answer, at: this.clock.now() }));
    } catch (e) {
      if (signal.aborted) return;
      log.warn('result/winner failed', gov, e);
      throw e;
    }
  }
}
