import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { log } from '../core/log/log';
import { Poll, PollScheduler } from '../core/poll/poll-scheduler';
import { CDraw, CTie, tieInfoOf } from '../domain/conflict/conflict';
import { checkConflictInfo } from '../domain/validate/conflict-answers';
import { IssueLog } from './issue-log';

const RETRY = 10 * 1000;
const EVERY = 10 * 1000;

@Injectable({ providedIn: 'root' })
export class ConflictStore {
  private readonly api = inject(ApiClient);
  private readonly issueLog = new IssueLog('conflict');
  private readonly _draws = signal<ReadonlyMap<number, CDraw>>(new Map());
  readonly draws = this._draws.asReadonly();
  private readonly _ties = signal<ReadonlyMap<number, CTie>>(new Map());
  readonly ties = this._ties.asReadonly();
  private readonly polls = inject(PollScheduler);
  private poll: Poll | null = null;
  private watched: number | null = null;

  private readonly busy = new Map<number, AbortController>();
  private readonly failed = new Map<number, number>();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.poll?.stop());
  }

  watch(id: number | null): void {
    const want = id !== null && !this._draws().has(id) ? id : null;
    if (want === this.watched && (want === null || this.poll?.running)) return;
    this.poll?.stop();
    this.poll = null;
    this.watched = want;
    if (want === null) return;
    this.poll = this.polls.create({
      every: () => EVERY,
      maxBackoff: 3 * EVERY,
      run: (signal) => this.pull(want, signal),
      while: () => this.watched === want && !this._draws().has(want),
    });
    this.poll.start();
  }

  want(id: number): void {
    if (this._draws().has(id) || this.busy.has(id)) return;
    const at = this.failed.get(id);
    if (at !== undefined && performance.now() - at < RETRY) return;
    const ctrl = new AbortController();
    this.busy.set(id, ctrl);
    void this.fetch(id, ctrl);
  }

  forget(id: number): void {
    this.busy.get(id)?.abort();
    this.busy.delete(id);
    this.failed.delete(id);
    if (!this._draws().has(id)) return;
    const m = new Map(this._draws());
    m.delete(id);
    this._draws.set(m);
  }

  private async read(id: number, signal: AbortSignal): Promise<CTie> {
    const r = await this.api.get(endpoints.conflictInfo(id), { signal });
    const { value, issues } = checkConflictInfo(id, r);
    this.issueLog.report(issues);
    return tieInfoOf(id, value, this._ties().get(id));
  }
  private keep(t: CTie): void {
    if (this._ties().get(t.wid) !== t) this._ties.update((m) => new Map(m).set(t.wid, t));
    const d = t.draw;
    if (d && this._draws().get(t.wid) !== d) this._draws.update((m) => new Map(m).set(t.wid, d));
  }

  private async pull(id: number, signal: AbortSignal): Promise<void> {
    try {
      const t = await this.read(id, signal);
      if (signal.aborted || this.watched !== id) return;
      this.keep(t);
    } catch (e) {
      if (signal.aborted) return;
      log.warn('conflict/info failed', id, e);
      throw e;
    }
  }

  private async fetch(id: number, ctrl: AbortController): Promise<void> {
    try {
      const t = await this.read(id, ctrl.signal);
      if (this.busy.get(id) !== ctrl) return;
      this.keep(t);
      if (!t.draw) throw new Error('conflict/get/info: no draw result yet');
      this.failed.delete(id);
    } catch (e) {
      if (this.busy.get(id) !== ctrl || ctrl.signal.aborted) return;
      this.failed.set(id, performance.now());
      log.warn('conflict/info failed', id, e);
    } finally {
      if (this.busy.get(id) === ctrl) this.busy.delete(id);
    }
  }
}
