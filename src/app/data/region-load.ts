import { log } from '../core/log/log';

export class RegionLoad {
  private cur: { ctl: AbortController; ids: number[] } | null = null;

  async run<T>(
    ids: readonly number[],
    read: (signal: AbortSignal) => Promise<T>,
    apply: (answer: T, ids: readonly number[]) => void,
    failed: (ids: readonly number[]) => void,
  ): Promise<void> {
    if (!ids.length) return;
    if (this.cur) {
      this.cur.ids = [...new Set([...this.cur.ids, ...ids])];
      return;
    }
    const load = { ctl: new AbortController(), ids: [...ids] };
    this.cur = load;
    try {
      const answer = await read(load.ctl.signal);
      if (!load.ctl.signal.aborted) apply(answer, load.ids);
    } catch (e) {
      if (load.ctl.signal.aborted) return;
      log.warn('statistics/region/all failed', e);
      failed(load.ids);
    } finally {
      if (this.cur === load) this.cur = null;
    }
  }

  keep(needed: (id: number) => boolean): void {
    const load = this.cur;
    if (!load) return;
    load.ids = load.ids.filter(needed);
    if (load.ids.length) return;
    load.ctl.abort();
    this.cur = null;
  }
}
