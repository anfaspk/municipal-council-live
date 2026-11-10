import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { log } from '../core/log/log';
import { Poll, PollScheduler } from '../core/poll/poll-scheduler';
import { clockStr } from '../domain/format';
import { checkWinners } from '../domain/validate/winners-answers';
import { allAnnounced, announcedOf, winnersOf, WRegion } from '../domain/winners/winners';
import { IssueLog } from './issue-log';

const EVERY = 60 * 1000;
const STALE_POLLS = 2;

export type WinnersLoad = 'idle' | 'wait' | 'loading' | 'ready' | 'failed';

@Injectable({ providedIn: 'root' })
export class WinnersStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly polls = inject(PollScheduler);
  private readonly issueLog = new IssueLog('winners');

  private readonly _region = signal<number | null>(null);
  private readonly answers = signal<ReadonlyMap<number, WRegion>>(new Map());
  private readonly at = signal<ReadonlyMap<number, number>>(new Map());
  private readonly fails = signal(0);
  private readonly _failed = signal(false);
  readonly region = this._region.asReadonly();
  readonly data = computed(() => {
    const id = this._region();
    return id === null ? null : (this.answers().get(id) ?? null);
  });
  readonly announced = computed(() => announcedOf(this.data()));
  readonly summaries = computed(
    () => new Map([...this.answers()].map(([id, r]) => [id, announcedOf(r)] as const)),
  );
  readonly done = computed(() => allAnnounced(this.data()));
  readonly load = computed<WinnersLoad>(() => {
    if (this._region() === null) return 'idle';
    if (!this.clock.counting()) return 'wait';
    if (this.data()) return 'ready';
    return this._failed() ? 'failed' : 'loading';
  });
  readonly updatedAt = computed(() => {
    const id = this._region(),
      ms = id === null ? undefined : this.at().get(id);
    return ms === undefined ? null : clockStr(ms);
  });
  readonly stale = computed(() => !!this.data() && this.fails() >= STALE_POLLS);

  private poll: Poll | null = null;

  constructor() {
    effect(() => {
      if (this.clock.counting()) untracked(() => this.restart());
    });
    inject(DestroyRef).onDestroy(() => this.poll?.stop());
  }

  watch(id: number | null): void {
    if (id === this._region()) return;
    this._region.set(id);
    this.restart();
  }

  retry(): void {
    this._failed.set(false);
    if (this.poll?.running) this.poll.refresh();
    else this.restart();
  }

  private restart(): void {
    this.poll?.stop();
    this.poll = null;
    this.fails.set(0);
    this._failed.set(false);
    const id = this._region();
    if (id === null || !this.clock.counting()) return;
    this.poll = this.polls.create({
      every: () => EVERY,
      run: (signal) => this.pull(id, signal),
      while: () => this._region() === id && !this.done(),
    });
    this.poll.start();
  }

  private async pull(id: number, signal: AbortSignal): Promise<void> {
    try {
      const r = await this.api.get(endpoints.winners(id), { signal });
      if (signal.aborted || id !== this._region()) return;
      const { value, issues } = checkWinners(id, r);
      this.issueLog.report(issues);
      const next = winnersOf(value, this.answers().get(id) ?? null);
      if (next !== this.answers().get(id)) this.answers.update((m) => new Map(m).set(id, next));
      this.at.update((m) => new Map(m).set(id, this.clock.now()));
      this.fails.set(0);
      this._failed.set(false);
    } catch (e) {
      if (signal.aborted) return;
      log.warn('result/winner failed', id, e);
      this.fails.update((n) => n + 1);
      this._failed.set(true);
      throw e;
    }
  }
}
