import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { log } from '../core/log/log';
import { Poll, PollScheduler } from '../core/poll/poll-scheduler';
import {
  AcceptLink,
  AcceptOutcome,
  acceptOutcome,
  AcceptRead,
  acceptSettled,
  acceptView,
} from '../domain/conflict/accept';
import { checkConflictInfo } from '../domain/validate/conflict-answers';
import { IssueLog } from './issue-log';

const EVERY = 10 * 1000;
const WAIT = 30 * 1000;

@Injectable({ providedIn: 'root' })
export class AcceptStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly polls = inject(PollScheduler);
  private readonly issueLog = new IssueLog('conflict');
  private readonly _read = signal<AcceptRead | null>(null);
  readonly read = this._read.asReadonly();
  private readonly _outcome = signal<AcceptOutcome | null>(null);
  readonly outcome = this._outcome.asReadonly();
  private readonly _sending = signal(false);
  readonly sending = this._sending.asReadonly();
  private _link: AcceptLink | null = null;
  private poll: Poll | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.poll?.stop());
  }

  get link(): AcceptLink | null {
    return this._link;
  }

  open(link: AcceptLink | null): void {
    this._link = link;
    this.poll?.stop();
    this.poll = null;
    if (!link) return;
    this.poll = this.polls.create({
      every: () => (this.state() === 'open' || this.state() === 'unknown' ? EVERY : WAIT),
      maxBackoff: 2 * WAIT,
      run: (signal) => this.pull(link, signal),
      while: () => !acceptSettled(this.state()),
    });
    this.poll.start();
  }

  async confirm(): Promise<void> {
    const link = this._link;
    if (!link || this._sending()) return;
    this._sending.set(true);
    try {
      this._outcome.set(acceptOutcome(await this.api.get(endpoints.conflictAccept(link))));
    } catch {
      log.warn('conflict/c failed');
      this._outcome.set('serverError');
    } finally {
      this._sending.set(false);
      this.retry();
    }
  }

  retry(): void {
    if (this.poll?.running) this.poll.refresh();
    else if (this._link && !acceptSettled(this.state())) this.open(this._link);
  }

  private state() {
    return acceptView(this._link, this._read(), this.clock.now(), this._outcome()).state;
  }

  private async pull(link: AcceptLink, signal: AbortSignal): Promise<void> {
    try {
      const r = await this.api.get(endpoints.conflictInfo(link.wid), { signal });
      if (signal.aborted) return;
      const { value, issues } = checkConflictInfo(link.wid, r);
      this.issueLog.report(issues);
      this._read.set({ info: value });
    } catch (e) {
      if (signal.aborted) return;
      const m = e instanceof Error ? e.message : '';
      if (/Not In Conflict Status$|Does Not Exist$/.test(m)) this._read.set({ fail: 'nodraw' });
      else if (!this._read()) this._read.set({ fail: 'error' });
      log.warn('conflict/info failed', link.wid, e);
      throw e;
    }
  }
}
