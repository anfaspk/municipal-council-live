import { computed, DOCUMENT, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { PollScheduler } from '../core/poll/poll-scheduler';
import { clockStr } from '../domain/format';
import { checkAges, checkStats, checkVillageAges, Issue } from '../domain/stats/check';
import { diffStats, reached, StatsEvents, toldKey } from '../domain/stats/diff';
import { indexGovs } from '../domain/stats/gov-index';
import {
  Base,
  BASE_UNREAD,
  baseOf,
  buildGovs,
  Gov,
  OverallResp,
  RegionResp,
  Village,
  villagesOf,
} from '../domain/stats/stats';
import { VillageDetail, villageDetail, WilayatDetail, wilayatDetail } from '../domain/stats/place';
import { nationalOf } from '../domain/stats/turnout';
import { checkOverall, checkRegion, checkVillage, checkWilayat } from '../domain/validate/answers';
import { log } from '../core/log/log';
import { IssueLog } from './issue-log';

export interface TurnoutEvents extends StatsEvents {
  villages: { wid: number };
  village: { vid: number };
  complete: undefined;
}
export type TurnoutEvent = {
  [K in keyof TurnoutEvents]: { type: K } & (TurnoutEvents[K] extends undefined
    ? unknown
    : TurnoutEvents[K]);
}[keyof TurnoutEvents];

const OMAN_MS = 4 * 60 * 60 * 1000;
const POLL = 10 * 1000,
  STALE_POLLS = 3;

@Injectable({ providedIn: 'root' })
export class TurnoutStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);

  readonly year = computed(() => {
    const s = this.clock.votingStart();
    return s === null ? '' : String(new Date(s + OMAN_MS).getUTCFullYear());
  });
  readonly every = POLL;
  readonly events = new Subject<TurnoutEvent>();

  private readonly _govs = signal<Gov[]>([]);
  private readonly _others = signal<Gov[]>([]);
  private readonly _base = signal<Base>({
    population: 0,
    registered: 0,
    regM: 0,
    regF: 0,
    unread: BASE_UNREAD,
  });
  private readonly _ready = signal(false);
  private readonly _updatedAt = signal(this.clock.now());
  private readonly _stale = signal(false);
  readonly govs = this._govs.asReadonly();
  readonly index = computed(() => indexGovs(this._govs()));
  readonly ranked = computed(() => this.index().ranked);
  readonly national = computed(() =>
    nationalOf(
      this._others().length ? [...this._govs(), ...this._others()] : this._govs(),
      this._base(),
    ),
  );
  readonly turnout = computed(() => this.national().turnout);
  readonly ready = this._ready.asReadonly();
  readonly done = this.clock.closed;
  readonly updatedAt = this._updatedAt.asReadonly();
  readonly stale = this._stale.asReadonly();
  readonly staleAt = computed(() => (this._stale() ? clockStr(this._updatedAt()) : null));

  private readonly poll = inject(PollScheduler).create({
    every: () => POLL,
    run: (signal) => this.pull(signal),
  });
  private staleT?: ReturnType<typeof setTimeout>;
  private wid: number | null = null;
  private vid: number | null = null;
  private readonly vil = new Map<number, Village[]>();
  private readonly wd = new Map<number, WilayatDetail>();
  private readonly vd = new Map<number, VillageDetail>();
  private readonly inflight = new Map<'w' | 'v', { id: number; ctl: AbortController }>();
  private readonly applied = new Map<string, number>();
  private seq = 0;
  private readonly told = new Set<string>();
  private readonly lastRegions = new Map<number, RegionResp>();
  private readonly regionAt = new Map<number, number>();
  private readonly issues = new IssueLog('statistics');
  private readonly slotIssues = { w: new IssueLog('statistics'), v: new IssueLog('statistics') };

  constructor() {
    effect(() => {
      if (this.done()) untracked(() => this.events.next({ type: 'complete' }));
    });
    inject(DOCUMENT).defaultView?.addEventListener('offline', () => {
      if (this.poll.running) this._stale.set(true);
    });
  }

  start(): void {
    if (this.poll.running) return;
    this.armStale();
    this.poll.start();
  }

  gov(id: string): Gov | null {
    return this.index().get(id);
  }
  rankOf(id: string): number {
    return this.index().rankOf(id);
  }

  watchWilayat(wid: number | null): void {
    if (wid === this.wid) return;
    this.wid = wid;
    if (wid === null) this.cancel('w');
    else void this.loadWilayat(wid);
  }
  watchVillage(vid: number | null): void {
    if (vid === this.vid) return;
    this.vid = vid;
    if (vid === null) this.cancel('v');
    else void this.loadVillage(vid);
  }
  villages(wid: number): Village[] | undefined {
    return this.vil.get(wid);
  }
  wilayat(wid: number): WilayatDetail | undefined {
    return this.wd.get(wid);
  }
  villageDetail(vid: number): VillageDetail | undefined {
    return this.vd.get(vid);
  }

  clockStr(): string {
    return clockStr(this.clock.now());
  }
  wilayatAt(apiId: number): string | null {
    const at = this.regionAt.get(apiId);
    return at !== undefined && at < this._updatedAt() ? clockStr(at) : null;
  }
  secondsSinceUpdate(): number {
    return Math.max(0, Math.round((this.clock.now() - this._updatedAt()) / 1000));
  }
  updatedClockStr(): string {
    return clockStr(this._updatedAt());
  }

  private async pull(signal: AbortSignal): Promise<void> {
    const extra = Promise.all([
      this.wid !== null ? this.loadWilayat(this.wid) : null,
      this.vid !== null ? this.loadVillage(this.vid) : null,
    ]);
    const ovP = this.api.get(endpoints.statsOverall, { signal });
    let ids = this._govs().map((g) => g.apiId);
    if (!ids.length)
      ids = await ovP.then(
        (o) => (checkOverall(o).value.hPSRL || []).map((x) => x.r.i),
        () => [],
      );
    const [ov, ...rg] = await Promise.allSettled([
      ovP,
      ...ids.map((id) => this.api.get(endpoints.statsRegion(id), { signal })),
    ]);
    if (signal.aborted) return;
    const regions = new Map<number, RegionResp>();
    rg.forEach((r, i) => {
      if (r.status === 'fulfilled') regions.set(ids[i]!, r.value);
      else log.warn('statistics/region failed', r.reason);
    });
    const bad =
      ov.status === 'fulfilled' && !(Array.isArray(ov.value.hPSRL) && ov.value.hPSRL.length)
        ? new Error('statistics/overall: no governorate list (hPSRL)')
        : null;
    if (ov.status === 'fulfilled' && !bad) this.publish(ov.value, regions);
    else log.warn('statistics/overall failed', bad ?? (ov as PromiseRejectedResult).reason);
    await extra;
    if (bad) throw bad;
    if (ov.status === 'rejected') throw ov.reason;
  }

  private publish(raw: OverallResp, answered: Map<number, RegionResp>): void {
    const prev = this._govs(),
      first = !this._ready(),
      before = this.turnout();
    const ov = checkOverall(raw),
      o = ov.value;
    answered.forEach((r, id) => this.lastRegions.set(id, r));
    const checked = new Map([...this.lastRegions].map(([id, r]) => [id, checkRegion(id, r)]));
    const regions = new Map([...answered.keys()].map((id) => [id, checked.get(id)!.value]));
    const govs = buildGovs(o, regions, prev);
    this._govs.set(govs);
    if (ov.others.length || this._others().length)
      this._others.set(
        ov.others.length ? buildGovs({ ...o, hPSRL: ov.others }, new Map(), this._others()) : [],
      );
    this._base.set(baseOf(o, first ? undefined : this._base()));
    this._updatedAt.set(this.clock.now());
    answered.forEach((_, id) => this.regionAt.set(id, this._updatedAt()));
    this.armStale();
    this.issues.report([
      ...ov.issues,
      ...[...checked.values()].flatMap((c) => c.issues),
      ...checkStats(
        { ...o, hPSRL: [...(o.hPSRL || []), ...ov.others] },
        new Map([...checked].map(([id, c]) => [id, c.value])),
      ),
    ]);
    const now = { govs, turnout: this.turnout() };
    if (first) {
      reached(now).forEach((k) => this.told.add(k));
      this._ready.set(true);
      return;
    }
    diffStats({ govs: prev, turnout: before }, now, this.told).forEach((e) => {
      const k = toldKey(e);
      if (k) this.told.add(k);
      this.events.next(e);
    });
  }

  private armStale(): void {
    this._stale.set(false);
    clearTimeout(this.staleT);
    this.staleT = setTimeout(() => this._stale.set(true), STALE_POLLS * POLL);
  }

  private loadWilayat(wid: number): Promise<void> {
    return this.load('w', wid, 'statistics/wilayat', async (signal) => {
      const r = checkWilayat(
        wid,
        await this.api.get(endpoints.statsWilayat(wid), { signal }),
      ).value;
      return () => {
        this.vil.set(wid, villagesOf(r, this.vil.get(wid)));
        this.wd.set(wid, wilayatDetail(wid, r, this.wd.get(wid)));
        this.check('w', (out) =>
          checkAges(out, 'statistics/wilayat/' + wid + ' hours', r.hPSL || []),
        );
        this.events.next({ type: 'villages', wid });
      };
    });
  }
  private loadVillage(vid: number): Promise<void> {
    return this.load('v', vid, 'statistics/village', async (signal) => {
      const r = checkVillage(
        vid,
        await this.api.get(endpoints.statsVillage(vid), { signal }),
      ).value;
      return () => {
        this.vd.set(vid, villageDetail(vid, r, this.vd.get(vid)));
        this.check('v', (out) => out.push(...checkVillageAges(vid, r)));
        this.events.next({ type: 'village', vid });
      };
    });
  }
  private async load(
    slot: 'w' | 'v',
    id: number,
    what: string,
    get: (signal: AbortSignal) => Promise<() => void>,
  ): Promise<void> {
    const cur = this.inflight.get(slot);
    if (cur?.id === id) return;
    cur?.ctl.abort();
    const ctl = new AbortController(),
      n = ++this.seq,
      key = slot + id;
    this.inflight.set(slot, { id, ctl });
    try {
      const apply = await get(ctl.signal);
      if (!ctl.signal.aborted && n > (this.applied.get(key) ?? 0)) {
        this.applied.set(key, n);
        apply();
      }
    } catch (e) {
      if (!ctl.signal.aborted) log.warn(what + ' failed', e);
    } finally {
      if (this.inflight.get(slot)?.ctl === ctl) this.inflight.delete(slot);
    }
  }
  private check(slot: 'w' | 'v', run: (out: Issue[]) => void): void {
    const out: Issue[] = [];
    run(out);
    this.slotIssues[slot].report(out);
  }
  private cancel(slot: 'w' | 'v'): void {
    this.inflight.get(slot)?.ctl.abort();
    this.inflight.delete(slot);
  }
}
