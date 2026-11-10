import { computed, DOCUMENT, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { PollScheduler } from '../core/poll/poll-scheduler';
import { clockStr } from '../domain/format';
import {
  CGov,
  CNat,
  countNat,
  CountRegionResp,
  CountWilayatResp,
  CWil,
  CWilRow,
} from '../domain/count/count';
import { checkCount, checkCountRows } from '../domain/count/check';
import { indexCount } from '../domain/count/count-index';
import { CountEvent, countComplete } from '../domain/count/diff';
import { reduceCount } from '../domain/count/reduce';
import { detailStep, regionStep } from '../domain/count/steps';
import { VoteHistory } from '../domain/count/leading';
import { num } from '../domain/stats/stats';
import { Issue } from '../domain/stats/check';
import { checkCountOverall, checkCountRegion, checkCountWilayat } from '../domain/validate/answers';
import { log } from '../core/log/log';
import { IssueLog } from './issue-log';
import { TurnoutStore } from './turnout.store';

export type CountStoreEvent =
  { type: 'ready' } | { type: 'poll'; events: CountEvent[]; complete: boolean };

const POLL = 10 * 1000,
  DETAIL_MAX = 16,
  STALE_POLLS = 3;

@Injectable({ providedIn: 'root' })
export class CountStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly turnout = inject(TurnoutStore);

  readonly every = POLL;
  readonly events = new Subject<CountStoreEvent>();
  readonly history = new VoteHistory();

  private readonly state = signal<CGov[]>([]);
  private readonly index = computed(() => indexCount(this.state()));
  private readonly _ready = signal(false);
  private readonly _done = signal(false);
  readonly ready = this._ready.asReadonly();
  readonly done = this._done.asReadonly();
  private readonly _updatedAt = signal(0);
  private readonly _stale = signal(false);
  readonly updatedAt = this._updatedAt.asReadonly();
  readonly stale = this._stale.asReadonly();
  readonly staleAt = computed(() =>
    this._stale() && this._updatedAt() ? clockStr(this._updatedAt()) : null,
  );
  private staleT?: ReturnType<typeof setTimeout>;
  private leadN = 0;
  private registered = 0;
  private focusGov: string | null = null;
  private readonly dirty = new Set<number>();
  private readonly rows = new Map<string, CWilRow>();
  private readonly fixed = new Map<string, Issue[]>();
  private readonly issues = new IssueLog('counting');
  private readonly poll = inject(PollScheduler).create({
    every: () => POLL,
    run: (signal) => this.pull(signal),
  });

  private readonly owners = new Set<object>();
  private readonly wanted = signal(0);

  get govs(): CGov[] {
    return this.state();
  }
  start(owner: object): void {
    this.owners.add(owner);
    this.wanted.set(this.owners.size);
    this.sync();
  }
  stop(owner: object): void {
    this.owners.delete(owner);
    this.wanted.set(this.owners.size);
    this.sync();
  }
  private sync(): void {
    const on = this.owners.size > 0 && this.clock.counting();
    if (on === this.poll.running) return;
    if (on) {
      this.armStale();
      this.poll.start();
    } else {
      this.poll.stop();
      clearTimeout(this.staleT);
    }
  }

  constructor() {
    effect(() => {
      this.wanted();
      this.clock.counting();
      untracked(() => this.sync());
    });
    inject(DOCUMENT).defaultView?.addEventListener('offline', () => {
      if (this.poll.running) this._stale.set(true);
    });
  }
  focus(gid: string | null): void {
    this.focusGov = gid;
  }

  national(): CNat {
    return countNat(this.state(), this.registered, this.leadN);
  }
  all(): CWil[] {
    return this.state().flatMap((g) => g.wil);
  }
  gov(id: string): CGov | null {
    return this.index().gov(id);
  }
  wil(gid: string, n: string): CWil | null {
    return (
      this.index()
        .gov(gid)
        ?.wil.find((w) => w.n === n) || null
    );
  }
  wilById(id: number): CWil | null {
    return this.index().wil(id);
  }

  private async pull(signal: AbortSignal): Promise<void> {
    const evs: CountEvent[] = [],
      first = !this._ready();
    const n = this.turnout.national();
    if (!this.registered && this.turnout.ready() && !n.unread.includes('registered'))
      this.registered = n.registered;
    if (!this.registered)
      this.api.get(endpoints.statsOverall, { signal }).then(
        (o) => {
          this.registered = num(o.r?.t) ?? 0;
        },
        () => {
        },
      );
    try {
      this.state.set(
        reduceCount(this.state(), {
          overall: this.checked(
            'o',
            checkCountOverall(await this.api.get(endpoints.countOverall, { signal })),
          ),
        }),
      );
    } catch (e) {
      if (signal.aborted) return;
      log.warn('counting/overall failed', e);
    }
    const govs = this.state(),
      rg = await Promise.allSettled(
        govs.map((g) => this.api.get(endpoints.countRegion(g.apiId), { signal })),
      );
    if (signal.aborted) return;
    const regions = new Map<number, CountRegionResp>();
    rg.forEach((r, i) => {
      if (r.status !== 'fulfilled') {
        log.warn('counting/region failed', r.reason);
        return;
      }
      const id = govs[i]!.apiId;
      regions.set(id, this.checked('r' + id, checkCountRegion(id, r.value)));
    });
    const ok = regions.size > 0,
      region = regionStep(this.state(), regions);
    this.state.set(region.govs);
    region.wanted.forEach((id) => this.dirty.add(id));
    this.collect(evs, region.events);
    const focused = (id: number) => +(this.index().govOf(id)?.id === this.focusGov);
    const want = [...this.dirty]
      .sort((a, b) => focused(b) - focused(a))
      .slice(0, first ? undefined : DETAIL_MAX);
    const det = await Promise.allSettled(
      want.map((id) => this.api.get(endpoints.countWilayat(id), { signal })),
    );
    if (signal.aborted) return;
    const details = new Map<number, CountWilayatResp>();
    det.forEach((r, i) => {
      if (r.status !== 'fulfilled') {
        log.warn('counting/wilayat failed', r.reason);
        return;
      }
      const id = want[i]!;
      this.dirty.delete(id);
      details.set(id, this.checked('w' + id, checkCountWilayat(id, r.value)));
    });
    const listed = detailStep(this.state(), details);
    this.state.set(listed.govs);
    this.history.record(listed.govs, Date.now());
    this.collect(evs, listed.events);
    regions.forEach((r) =>
      (r.cIWL || []).forEach((row) => row?.w && this.rows.set('r' + row.w.i, row)),
    );
    details.forEach((row, id) => this.rows.set('w' + id, row));
    this.issues.report([
      ...[...this.fixed.values()].flat(),
      ...checkCountRows(this.rows.values()),
      ...checkCount(this.state()),
    ]);
    if (!ok) throw new Error('counting/region: no answer');
    this._updatedAt.set(this.clock.now());
    this.armStale();
    const was = this._done();
    if (!was && countComplete(this.state())) this._done.set(true);
    if (first) {
      this._ready.set(true);
      this.events.next({ type: 'ready' });
    } else this.events.next({ type: 'poll', events: evs, complete: !was && this._done() });
  }

  private checked<T>(key: string, c: { value: T; issues: Issue[] }): T {
    this.fixed.set(key, c.issues);
    return c.value;
  }

  private armStale(): void {
    this._stale.set(false);
    clearTimeout(this.staleT);
    this.staleT = setTimeout(() => this._stale.set(true), STALE_POLLS * POLL);
  }

  private collect(evs: CountEvent[], found: CountEvent[]): void {
    found.forEach((e) => {
      if (e.type === 'lead') this.leadN++;
      evs.push(e);
    });
  }
}
