import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Subject } from 'rxjs';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { PollScheduler } from '../core/poll/poll-scheduler';
import { clockStr } from '../domain/format';
import { checkAges, checkStats, checkVillageAges, Issue } from '../domain/stats/check';
import { diffStats, reached, StatsEvents, toldKey } from '../domain/stats/diff';
import { fillGovs, fillOverall, fillRegion } from '../domain/stats/fill';
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
import { PlaceSlots, type Slot } from './place-slots';
import { RegionNeeds, withIds, type RegionNeed } from './region-needs';
import { StaleClock } from './stale-clock';

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
  STALE_POLLS = 3,
  SETTLE = 60 * 1000;

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
  private readonly fresh = new StaleClock(STALE_POLLS * POLL, () => this.poll.running);
  private shown: Gov[] = [];
  readonly govs = computed(() => (this.shown = fillGovs(this._govs(), this.shown)));
  readonly index = computed(() => indexGovs(this.govs()));
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
  readonly stale = this.fresh.on;
  readonly staleAt = computed(() => (this.stale() ? clockStr(this._updatedAt()) : null));

  private readonly poll = inject(PollScheduler).create({
    every: () => POLL,
    run: (signal) => this.pull(signal),
  });
  private wid: number | null = null;
  private vid: number | null = null;
  private readonly vil = new Map<number, Village[]>();
  private readonly wd = new Map<number, WilayatDetail>();
  private readonly vd = new Map<number, VillageDetail>();
  private readonly slots = new PlaceSlots(() => this.settled());
  private finished = false;
  private readonly finalRegions = new Set<number>();
  private readonly told = new Set<string>();
  private readonly lastRegions = new Map<number, RegionResp>();
  private readonly regionAt = new Map<number, number>();
  private readonly issues = new IssueLog('statistics');
  private readonly needs = new RegionNeeds();
  private lastOverall: OverallResp | null = null;
  private readonly _read = signal<ReadonlySet<number>>(new Set());
  private readonly regionLoads = new Map<number, AbortController>();
  private readonly slotIssues = { w: new IssueLog('statistics'), v: new IssueLog('statistics') };

  constructor() {
    effect(() => {
      if (this.done()) untracked(() => this.events.next({ type: 'complete' }));
    });
  }

  start(): void {
    if (this.poll.running || this.finished) return;
    this.fresh.arm();
    this.poll.start();
  }
  stop(): void {
    if (!this.poll.running) return;
    this.poll.stop();
    this.fresh.stop();
  }

  needRegions(owner: object, ids: RegionNeed): void {
    const had = new Set(this.needs.wanted(this.listed()));
    this.needs.set(owner, ids);
    if (this._ready())
      this.needs.wanted(this.listed()).forEach((id) => had.has(id) || void this.loadRegion(id));
  }
  release(owner: object): void {
    if (!this.needs.delete(owner)) return;
    const keep = new Set(this.needs.wanted(this.listed()));
    this.regionLoads.forEach(
      (ctl, id) => keep.has(id) || (ctl.abort(), this.regionLoads.delete(id)),
    );
  }
  regionRead(apiId: number): boolean {
    return (
      this._read().has(apiId) || (this._ready() && !this._govs().some((g) => g.apiId === apiId))
    );
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
    if (wid === null) this.slots.cancel('w');
    else void this.loadWilayat(wid);
  }
  watchVillage(vid: number | null): void {
    if (vid === this.vid) return;
    this.vid = vid;
    if (vid === null) this.slots.cancel('v');
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
    const last = this.settled(),
      extra = Promise.all([
        this.wid !== null ? this.loadWilayat(this.wid) : null,
        this.vid !== null ? this.loadVillage(this.vid) : null,
      ]);
    const ovP = this.api.get(endpoints.statsOverall, { signal });
    let ids = this.listed();
    if (!ids.length && this.needs.size)
      ids = await ovP.then(
        (o) => (checkOverall(o).value.hPSRL || []).map((x) => x.r.i),
        () => [],
      );
    ids = this.needs.wanted(ids);
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
    if (ov.status === 'fulfilled') this.publish(ov.value, regions, ids);
    else log.warn('statistics/overall failed', ov.reason);
    await extra;
    if (ov.status === 'rejected') throw ov.reason;
    if (last) regions.forEach((_, id) => this.finalRegions.add(id));
    if (last && regions.size === ids.length) this.finish();
  }

  private settled(): boolean {
    const end = this.clock.votingEnd();
    return this.clock.closed() && end !== null && this.clock.now() >= end + SETTLE;
  }
  private finish(): void {
    this.finished = true;
    this.poll.stop();
    this.fresh.stop();
  }

  private publish(raw: OverallResp, answered: Map<number, RegionResp>, asked: number[]): void {
    const prev = this._govs(),
      first = !this._ready(),
      before = this.turnout();
    const ov = checkOverall(raw),
      o = fillOverall(ov.value, new Set(prev.map((g) => g.apiId)));
    this.lastOverall = raw;
    answered.forEach((r, id) => this.lastRegions.set(id, r));
    const checked = new Map([...this.lastRegions].map(([id, r]) => [id, checkRegion(id, r)]));
    const regions = new Map(
      [...answered.keys()].map((id) => [id, fillRegion(id, checked.get(id)!.value, prev)]),
    );
    const govs = buildGovs(o, regions, prev);
    this._govs.set(govs);
    if (ov.others.length || this._others().length)
      this._others.set(
        ov.others.length ? buildGovs({ ...o, hPSRL: ov.others }, new Map(), this._others()) : [],
      );
    this._base.set(baseOf(o, first ? undefined : this._base()));
    this._updatedAt.set(this.clock.now());
    answered.forEach((_, id) => this.regionAt.set(id, this._updatedAt()));
    this._read.update((r) => withIds(r, asked));
    this.fresh.arm();
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

  private listed(): number[] {
    return this._govs().map((g) => g.apiId);
  }
  private async loadRegion(id: number): Promise<void> {
    if (this.regionLoads.has(id) || this.finalRegions.has(id)) return;
    const ctl = new AbortController(),
      from = this.clock.now(),
      last = this.settled();
    this.regionLoads.set(id, ctl);
    try {
      const r = await this.api.get(endpoints.statsRegion(id), { signal: ctl.signal });
      if (ctl.signal.aborted || !this.lastOverall || (this.regionAt.get(id) ?? -1) >= from) return;
      this.lastRegions.set(id, r);
      const prev = this._govs(),
        o = fillOverall(checkOverall(this.lastOverall).value, new Set(prev.map((g) => g.apiId)));
      this._govs.set(
        buildGovs(o, new Map([[id, fillRegion(id, checkRegion(id, r).value, prev)]]), prev),
      );
      this.regionAt.set(id, this.clock.now());
      this._read.update((r) => withIds(r, [id]));
      if (last) this.finalRegions.add(id);
    } catch (e) {
      if (ctl.signal.aborted) return;
      log.warn('statistics/region failed', e);
      this._read.update((r) => withIds(r, [id]));
    } finally {
      if (this.regionLoads.get(id) === ctl) this.regionLoads.delete(id);
    }
  }

  private loadWilayat(wid: number): Promise<void> {
    return this.slots.load('w', wid, 'statistics/wilayat', async (signal) => {
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
    return this.slots.load('v', vid, 'statistics/village', async (signal) => {
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
  private check(slot: Slot, run: (out: Issue[]) => void): void {
    const out: Issue[] = [];
    run(out);
    this.slotIssues[slot].report(out);
  }
}
