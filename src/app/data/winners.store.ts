import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { log } from '../core/log/log';
import { Poll, PollScheduler } from '../core/poll/poll-scheduler';
import { clockStr } from '../domain/format';
import { GEO } from '../domain/geo/geo.data';
import { checkWinners } from '../domain/validate/winners-answers';
import {
  allAnnounced,
  announcedOf,
  regionOf,
  wilOf,
  WRegion,
  WWil,
} from '../domain/winners/winners';
import { IssueLog } from './issue-log';
import { TurnoutStore } from './turnout.store';
import { WinnersNames } from './winners-names';

const EVERY = 60 * 1000;
const STALE_POLLS = 2;
const STATS_WAIT = 30 * 1000;

export type WinnersLoad = 'idle' | 'wait' | 'loading' | 'ready' | 'failed';

interface Entry {
  gov: number;
  wil: WWil;
  at: number;
}

@Injectable({ providedIn: 'root' })
export class WinnersStore {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly stats = inject(TurnoutStore);
  private readonly fallback = inject(WinnersNames);
  private readonly polls = inject(PollScheduler);
  private readonly issueLog = new IssueLog('winners');

  private readonly _region = signal<number | null>(null);
  private readonly _wil = signal<number | null>(null);
  private readonly cache = signal<ReadonlyMap<number, Entry>>(new Map());
  private readonly names = signal<ReadonlyMap<number, string>>(new Map());
  private readonly fails = signal(0);
  private readonly inflight = new Map<number, Promise<void>>();
  private ahead: AbortController | null = null;
  private next: number | null = null;
  private poll: Poll | null = null;
  private last: WRegion | null = null;
  private readonly late = signal(false);
  private lateT?: ReturnType<typeof setTimeout>;
  private readonly statsFailed = computed(() => this.stats.stale() || this.late());
  readonly namesWanted = computed<number | null | undefined>(() => {
    if (!this.clock.counting() || !this.statsFailed()) return undefined;
    const id = this._region();
    if (id !== null && !this.stats.regionRead(id)) return id;
    return this.stats.ready() ? undefined : null;
  });

  readonly region = this._region.asReadonly();
  readonly data = computed<WRegion | null>(() => {
    const id = this._region();
    if (id === null) return (this.last = null);
    const g = this.stats.gov(String(id)),
      listed = !!g && this.stats.regionRead(id);
    if (!listed && !this.statsFailed()) return (this.last = null);
    const read = new Map<number, WWil>();
    for (const [wid, e] of this.cache()) if (e.gov === id) read.set(wid, e.wil);
    const rows = listed
      ? g.wils
      : (GEO.wilPt[String(id)] ?? []).map((p) => ({
          id: p.i,
          ar: this.fallback.wil(p.i) || read.get(p.i)?.name || '',
        }));
    const name = this.names().get(id) || g?.ar || this.fallback.gov(id);
    const prev = this.last?.id === id ? this.last : null;
    return (this.last = regionOf(id, name, rows, read, prev));
  });
  govName(id: number): string {
    return this.names().get(id) || this.fallback.gov(id);
  }
  readonly announced = computed(() => announcedOf(this.data()));
  readonly summaries = computed(() => {
    const by = new Map<number, WWil[]>();
    for (const e of this.cache().values()) by.set(e.gov, [...(by.get(e.gov) ?? []), e.wil]);
    const out = new Map<number, { done: number; all: number }>();
    for (const [gov, wils] of by) {
      const all = this.stats.gov(String(gov))?.wils.length || (GEO.wilPt[String(gov)]?.length ?? 0);
      if (all && wils.length >= all)
        out.set(gov, { done: wils.filter((w) => w.published).length, all });
    }
    return out;
  });
  readonly done = computed(() => allAnnounced(this.data()));
  readonly load = computed<WinnersLoad>(() => {
    if (this._region() === null) return 'idle';
    if (!this.clock.counting()) return 'wait';
    if (!this.data()) return 'loading';
    const wid = this._wil();
    if (wid === null || this.cache().has(wid)) return 'ready';
    return this.fails() ? 'failed' : 'loading';
  });
  readonly updatedAt = computed(() => {
    const wid = this._wil(),
      e = wid === null ? undefined : this.cache().get(wid);
    return e ? clockStr(e.at) : null;
  });
  readonly stale = computed(() => {
    const wid = this._wil(),
      e = wid === null ? undefined : this.cache().get(wid);
    return !!e && !e.wil.published && this.fails() >= STALE_POLLS;
  });

  constructor() {
    effect(() => {
      if (this.clock.counting()) untracked(() => this.restart());
    });
    inject(DestroyRef).onDestroy(() => {
      this.stop();
      clearTimeout(this.lateT);
    });
  }

  askNames(gov: number | null): void {
    this.fallback.want(gov);
  }
  dropNames(): void {
    this.fallback.drop();
  }

  watch(id: number | null): void {
    if (id === this._region()) return;
    this._region.set(id);
    this._wil.set(null);
    this.next = null;
    clearTimeout(this.lateT);
    if (id === null) {
      this.stats.release(this);
      this.stop();
    } else {
      this.stats.needRegions(this, [id]);
      if (!this.late())
        this.lateT = setTimeout(() => {
          if (this._region() === id && !this.stats.regionRead(id)) this.late.set(true);
        }, STATS_WAIT);
    }
    this.restart();
  }

  show(wil: number | null, next: number | null = null): void {
    this.next = next !== wil ? next : null;
    if (wil !== this._wil()) {
      this._wil.set(wil);
      this.restart();
    } else this.readAhead();
  }

  retry(): void {
    this.fails.set(0);
    if (this.poll?.running) this.poll.refresh();
    else this.restart();
  }

  private stop(): void {
    this.poll?.stop();
    this.poll = null;
    this.ahead?.abort();
    this.ahead = null;
  }

  private final(wid: number): boolean {
    return !!this.cache().get(wid)?.wil.published;
  }

  private restart(): void {
    this.poll?.stop();
    this.poll = null;
    this.fails.set(0);
    const gov = this._region(),
      wid = this._wil();
    if (gov !== null && wid !== null && this.clock.counting() && !this.final(wid))
      this.poll = this.pollWil(gov, wid);
    this.readAhead();
  }

  private pollWil(gov: number, wid: number): Poll {
    const poll = this.polls.create({
      every: () => {
        const e = this.cache().get(wid);
        return e ? Math.max(1000, EVERY - (this.clock.now() - e.at)) : EVERY;
      },
      run: (signal) => {
        const e = this.cache().get(wid);
        if (e && this.clock.now() - e.at < EVERY) return Promise.resolve();
        return this.read(gov, wid, signal, true);
      },
      while: () => this._wil() === wid && this._region() === gov && !this.final(wid),
    });
    poll.start();
    return poll;
  }

  private readAhead(): void {
    const gov = this._region(),
      wid = this.next;
    if (gov === null || wid === null || !this.clock.counting()) return;
    if (this.cache().has(wid) || this.inflight.has(wid)) return;
    this.ahead ??= new AbortController();
    void this.read(gov, wid, this.ahead.signal, false).catch(() => undefined);
  }

  private read(gov: number, wid: number, signal: AbortSignal, own: boolean): Promise<void> {
    const going = this.inflight.get(wid);
    const p =
      going ??
      this.fetch(gov, wid, signal).finally(() => {
        this.inflight.delete(wid);
      });
    if (!going) this.inflight.set(wid, p);
    return p.then(
      () => {
        if (going && !signal.aborted && !this.cache().has(wid))
          return this.read(gov, wid, signal, own);
        if (own && this._wil() === wid) this.fails.set(0);
        return undefined;
      },
      (e: unknown) => {
        if (signal.aborted) return;
        if (own && this._wil() === wid) this.fails.update((n) => n + 1);
        throw e;
      },
    );
  }

  private async fetch(gov: number, wid: number, signal: AbortSignal): Promise<void> {
    try {
      const r = await this.api.get(endpoints.winners(gov, wid), { signal });
      if (signal.aborted) return;
      const { value, issues } = checkWinners(gov, r);
      this.issueLog.report(issues);
      const was = this.cache().get(wid);
      const w = wilOf(value, wid, was?.wil ?? null);
      if (!w) throw new Error('result/winner: wilayat ' + wid + ' not in the answer');
      this.cache.update((m) => new Map(m).set(wid, { gov, wil: w, at: this.clock.now() }));
      const name = value.r?.n;
      if (name && this.names().get(gov) !== name)
        this.names.update((m) => new Map(m).set(gov, name));
    } catch (e) {
      if (signal.aborted) return;
      log.warn('result/winner failed', gov, wid, e);
      throw e;
    }
  }
}
