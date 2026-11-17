import { inject, Injectable } from '@angular/core';
import { ApiClient } from '../core/api/api-client';
import { endpoints } from '../core/api/endpoints';
import { ServerClock } from '../core/clock/server-clock.service';
import { log } from '../core/log/log';
import { checkCountOverall, checkCountRegion } from '../domain/validate/answers';
import { CountNames } from './count-names';
import { IssueLog } from './issue-log';

const RETRY = 60 * 1000;

@Injectable({ providedIn: 'root' })
export class WinnersNames {
  private readonly api = inject(ApiClient);
  private readonly clock = inject(ServerClock);
  private readonly names = inject(CountNames);
  private readonly issueLog = new IssueLog('winners names');

  private readonly done = new Set<'o' | number>();
  private readonly busy = new Set<'o' | number>();
  private readonly failedAt = new Map<'o' | number, number>();
  private wanted: number | null | undefined;
  private retryT?: ReturnType<typeof setTimeout>;

  gov(id: number): string {
    return this.names.gov(id);
  }
  wil(id: number): string {
    return this.names.wil(id);
  }

  want(gov: number | null): void {
    this.wanted = gov;
    if (!this.clock.counting()) return;
    if (!this.names.hasGovs()) this.read('o');
    if (gov !== null && !this.names.hasWils(gov)) this.read(gov);
  }
  drop(): void {
    this.wanted = undefined;
    clearTimeout(this.retryT);
  }

  private read(what: 'o' | number): void {
    if (this.done.has(what) || this.busy.has(what)) return;
    const at = this.failedAt.get(what);
    if (at !== undefined && performance.now() - at < RETRY) return;
    this.busy.add(what);
    void (what === 'o' ? this.overall() : this.region(what))
      .then(() => {
        this.done.add(what);
        this.failedAt.delete(what);
      })
      .catch((e: unknown) => {
        log.warn(
          'winners names: ' + (what === 'o' ? 'counting/overall' : 'counting/region') + ' failed',
          e,
        );
        this.failedAt.set(what, performance.now());
        clearTimeout(this.retryT);
        this.retryT = setTimeout(() => {
          if (this.wanted !== undefined) this.want(this.wanted);
        }, RETRY);
      })
      .finally(() => this.busy.delete(what));
  }

  private async overall(): Promise<void> {
    const { value, issues } = checkCountOverall(await this.api.get(endpoints.countOverall));
    this.issueLog.report(issues);
    this.names.take((value.cIRL ?? []).flatMap((r) => (r?.r ? [[r.r.i, r.r.n] as const] : [])));
  }

  private async region(id: number): Promise<void> {
    const { value, issues } = checkCountRegion(id, await this.api.get(endpoints.countRegion(id)));
    this.issueLog.report(issues);
    this.names.take(
      [],
      (value.cIWL ?? []).flatMap((r) => (r?.w ? [[r.w.i, r.w.n] as const] : [])),
      id,
    );
  }
}
