import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { API_BASE } from '../core/api/api-base';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { PollScheduler } from '../core/poll/poll-scheduler';
import { forgetDown, watchDown } from '../core/screen/error-page';
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
import { CountEvent, countComplete, govPublished, natPublished } from '../domain/count/diff';
import { fillCount } from '../domain/count/fill';
import { reduceCount } from '../domain/count/reduce';
import { detailStep, regionStep } from '../domain/count/steps';
import { VoteHistory } from '../domain/count/leading';
import { num } from '../domain/stats/stats';
import { Issue } from '../domain/stats/check';
import { checkCountOverall, checkCountRegion, checkCountWilayat } from '../domain/validate/answers';
import { log } from '../core/log/log';
import { IssueLog } from './issue-log';
import { StaleClock } from './stale-clock';
import { TurnoutStore } from './turnout.store';

export type CountStoreEvent =
  { type: 'ready' } | { type: 'poll'; events: CountEvent[]; complete: boolean };

const POLL = 10 * 1000,
  DETAIL_MAX = 16,
  SPREAD_NEAR = 10 * 1000,
  SPREAD = 3 * 1000,
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
  private filled: CGov[] = [];
  private readonly shown = computed(() => (this.filled = fillCount(this.state(), this.filled)));
  private readonly shownIndex = computed(() => indexCount(this.shown()));
  private readonly _ready = signal(false);
  private readonly _done = signal(false);
  readonly ready = this._ready.asReadonly();
  readonly done = this._done.asReadonly();
  private readonly _updatedAt = signal(0);
  private readonly fresh = new StaleClock(STALE_POLLS * POLL, () => this.poll.running);
  readonly updatedAt = this._updatedAt.asReadonly();
  readonly stale = this.fresh.on;
  readonly staleAt = computed(() =>
    this.stale() && this._updatedAt() ? clockStr(this._updatedAt()) : null,
  );
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
    spread: () => {
      const c = this.clock.countingStart();
      return c !== null && this.clock.now() - c < SPREAD_NEAR ? SPREAD : 0;
    },
  });

  private readonly owners = new Set<object>();
  private readonly wanted = signal(0);
  private readonly screens = new Set<object>();
  private readonly screenN = signal(0);
  private readonly holds = new Set<() => boolean>();
  private final = false;
  private readonly finalGovs = new Set<number>();
  private need: number | null = null;
  private readonly asking = new Set<number>();
  private again: ReturnType<typeof setTimeout> | undefined;

  get govs(): CGov[] {
    return this.shown();
  }
  start(owner: object, screen = false): void {
    this.owners.add(owner);
    if (screen) this.screens.add(owner);
    this.wanted.set(this.owners.size);
    this.screenN.set(this.screens.size);
    this.sync();
  }
  stop(owner: object): void {
    this.owners.delete(owner);
    this.screens.delete(owner);
    this.wanted.set(this.owners.size);
    this.screenN.set(this.screens.size);
    this.sync();
  }
  private sync(): void {
    const on = !this.final && this.owners.size > 0 && this.clock.counting();
    if (on === this.poll.running) return;
    if (on) {
      this.fresh.arm();
      this.poll.start();
    } else {
      this.poll.stop();
      this.fresh.stop();
    }
  }

  constructor() {
    effect(() => {
      this.wanted();
      this.clock.counting();
      untracked(() => this.sync());
    });
    effect((onCleanup) => {
      if (!this.screenN() || !this.clock.counting()) return;
      if (this._ready()) return forgetDown();
      onCleanup(watchDown(API_BASE + '/' + endpoints.countOverall.path));
    });
  }
  holdDetails(check: () => boolean): () => void {
    this.holds.add(check);
    return () => this.holds.delete(check);
  }
  focus(gid: string | null): void {
    this.focusGov = gid;
  }
  want(id: number | null): void {
    this.need = id;
    clearTimeout(this.again);
    this.ask(id);
  }
  private ask(id: number | null): void {
    if (id === null || !this.dirty.has(id) || this.asking.has(id) || !this.inFinal(id)) return;
    clearTimeout(this.again);
    this.asking.add(id);
    const retry = (e: unknown) => {
      log.warn('counting/wilayat failed', e);
      this.again = setTimeout(() => this.need === id && this.ask(id), POLL);
    };
    this.api
      .get(endpoints.countWilayat(id))
      .then((r) => {
        const row = this.checked('w' + id, checkCountWilayat(id, r));
        if (!row.lCL?.length) return retry(new Error('counting/wilayat/' + id + ': no candidates'));
        const listed = detailStep(this.state(), new Map([[id, row]]));
        this.dirty.delete(id);
        this.rows.set('w' + id, row);
        this.state.set(listed.govs);
        this.history.record(listed.govs, this.clock.now());
        if (this._ready())
          this.events.next({ type: 'poll', events: listed.events, complete: false });
      }, retry)
      .finally(() => this.asking.delete(id));
  }
  private inFinal(id: number): boolean {
    const g = this.index().govOf(id);
    return !!g && this.finalGovs.has(g.apiId);
  }

  national(): CNat {
    return countNat(this.shown(), this.registered, this.leadN);
  }
  all(): CWil[] {
    return this.shown().flatMap((g) => g.wil);
  }
  gov(id: string): CGov | null {
    return this.shownIndex().gov(id);
  }
  wil(gid: string, n: string): CWil | null {
    return (
      this.shownIndex()
        .gov(gid)
        ?.wil.find((w) => w.n === n) || null
    );
  }
  wilById(id: number): CWil | null {
    return this.shownIndex().wil(id);
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
    let overall = false;
    try {
      this.state.set(
        reduceCount(this.state(), {
          overall: this.checked(
            'o',
            checkCountOverall(await this.api.get(endpoints.countOverall, { signal })),
          ),
        }),
      );
      overall = true;
    } catch (e) {
      if (signal.aborted) return;
      log.warn('counting/overall failed', e);
    }
    const govs = this.state().filter((g) => !this.finalGovs.has(g.apiId)),
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
    const ok = overall || regions.size > 0 || !govs.length,
      region = regionStep(this.state(), regions);
    this.state.set(region.govs);
    region.wanted.forEach((id) => this.dirty.add(id));
    region.govs.forEach((g) => {
      if (govPublished(g)) this.finalGovs.add(g.apiId);
    });
    this.ask(this.need);
    this.collect(evs, region.events);
    const index = this.index(),
      rank = (id: number) => {
        const w = index.wil(id);
        return (index.govOf(id)?.id === this.focusGov ? 2 : 0) + (w?.conflict || w?.drawn ? 1 : 0);
      };
    const leaving = [...this.holds].some((h) => h()),
      dirty = [...this.dirty].filter((id) => !this.inFinal(id)).sort((a, b) => rank(b) - rank(a)),
      want = leaving
        ? []
        : dirty.slice(0, (first ? dirty.filter((id) => rank(id) > 0).length : 0) + DETAIL_MAX);
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
    this.history.record(listed.govs, this.clock.now());
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
    this.fresh.arm();
    const was = this._done();
    if (!was && countComplete(this.state())) this._done.set(true);
    if (first) {
      this._ready.set(true);
      this.events.next({ type: 'ready' });
    } else this.events.next({ type: 'poll', events: evs, complete: !was && this._done() });
    if (natPublished(this.state())) {
      this.final = true;
      this.poll.stop();
      this.fresh.stop();
    }
  }

  private checked<T>(key: string, c: { value: T; issues: Issue[] }): T {
    this.fixed.set(key, c.issues);
    return c.value;
  }

  private collect(evs: CountEvent[], found: CountEvent[]): void {
    found.forEach((e) => {
      if (e.type === 'lead') this.leadN++;
      evs.push(e);
    });
  }
}
