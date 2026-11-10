import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { log } from '../core/log/log';
import { clockStr } from '../domain/format';
import { interimOf, InterimPhase, interimPhase, IWil } from '../domain/interim/interim';
import { Issue } from '../domain/stats/check';
import { checkInterimWilayat } from '../domain/validate/answers';
import { IssueLog } from './issue-log';
import { TurnoutStore } from './turnout.store';

const RETRY = 10 * 1000;

@Injectable({ providedIn: 'root' })
export class InterimStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly stats = inject(TurnoutStore);
  private readonly issueLog = new IssueLog('intermediate');
  private readonly issues = new Map<number, Issue[]>();

  private readonly watching = signal(false);
  private readonly now = signal(0);
  private readonly _results = signal<ReadonlyMap<number, IWil>>(new Map());
  readonly results = this._results.asReadonly();

  readonly phase = computed<InterimPhase>(() => {
    const c = this.clock;
    if (!this.watching() || c.phase() !== 'live' || c.closed() || c.counting()) return 'off';
    return interimPhase(c.interimFrom(), c.interimTo(), this.now());
  });
  readonly left = computed(() => {
    const p = this.phase(),
      at = p === 'soon' ? this.clock.interimFrom() : p === 'open' ? this.clock.interimTo() : null;
    return at === null ? null : Math.max(0, at - this.now());
  });
  readonly fromAt = computed(() => this.at(this.clock.interimFrom()));
  readonly toAt = computed(() => this.at(this.clock.interimTo()));

  private timer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private window: number | null = null;
  private ctrl: AbortController | null = null;
  private readonly busy = new Set<number>();
  private wanted: number | null = null;

  constructor() {
    effect(() => {
      const open = this.phase() === 'open';
      untracked(() => (open ? this.enter() : this.watching() ? this.drop() : this.pause()));
    });
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      this.drop();
    });
  }

  watch(on: boolean): void {
    if (on === this.watching()) return;
    this.watching.set(on);
    clearTimeout(this.timer);
    if (on) this.tick();
  }

  want(id: number): void {
    if (this.phase() !== 'open') return;
    this.enter();
    this.wanted = id;
    if (this._results().has(id) || this.busy.has(id)) return;
    this.ctrl ??= new AbortController();
    this.busy.add(id);
    void this.fetch(id, this.ctrl);
  }

  private at(ms: number | null): string | null {
    return ms === null ? null : clockStr(ms);
  }

  private tick(): void {
    if (!this.watching()) return;
    this.now.set(this.clock.now());
    const l = this.left(),
      r = l === null ? 0 : l % 1000;
    this.timer = setTimeout(() => this.tick(), (r === 0 ? 1000 : r) + 5);
  }

  private enter(): void {
    const from = this.clock.interimFrom();
    if (from === this.window) return;
    this.drop();
    this.window = from;
  }

  private async fetch(id: number, ctrl: AbortController): Promise<void> {
    try {
      const r = await this.api.get(endpoints.interimWilayat(id), { signal: ctrl.signal });
      if (ctrl !== this.ctrl) return;
      const { value, issues } = checkInterimWilayat(id, r);
      this.issues.set(id, issues);
      this.issueLog.report([...this.issues.values()].flat());
      const name = this.stats
        .govs()
        .flatMap((g) => g.wils)
        .find((w) => w.id === id)?.name;
      this._results.update((m) => new Map(m).set(id, interimOf(id, value, name)));
    } catch (e) {
      if (ctrl !== this.ctrl || ctrl.signal.aborted) return;
      log.warn('intermediate/result failed', id, e);
      clearTimeout(this.retryTimer);
      this.retryTimer = setTimeout(() => {
        if (this.wanted === id) this.want(id);
      }, RETRY);
    } finally {
      if (ctrl === this.ctrl) this.busy.delete(id);
    }
  }

  private pause(): void {
    this.ctrl?.abort();
    this.ctrl = null;
    this.busy.clear();
    this.wanted = null;
    clearTimeout(this.retryTimer);
  }
  private drop(): void {
    this.pause();
    this.window = null;
    this.issues.clear();
    if (this._results().size) this._results.set(new Map());
  }
}
