import { log } from '../core/log/log';

export type Slot = 'w' | 'v';

export class PlaceSlots {
  private readonly inflight = new Map<Slot, { id: number; ctl: AbortController }>();
  private readonly applied = new Map<string, number>();
  private readonly kept = new Map<string, () => void>();
  private seq = 0;

  constructor(private readonly final: () => boolean) {}

  async load(
    slot: Slot,
    id: number,
    what: string,
    get: (signal: AbortSignal) => Promise<() => void>,
  ): Promise<void> {
    const cur = this.inflight.get(slot);
    if (cur?.id === id) return;
    cur?.ctl.abort();
    const ctl = new AbortController(),
      n = ++this.seq,
      key = slot + id,
      kept = this.kept.get(key),
      final = this.final();
    this.inflight.set(slot, { id, ctl });
    try {
      const apply = kept ? await Promise.resolve(kept) : await get(ctl.signal);
      if (!ctl.signal.aborted && n > (this.applied.get(key) ?? 0)) {
        this.applied.set(key, n);
        if (final) this.kept.set(key, apply);
        apply();
      }
    } catch (e) {
      if (!ctl.signal.aborted) log.warn(what + ' failed', e);
    } finally {
      if (this.inflight.get(slot)?.ctl === ctl) this.inflight.delete(slot);
    }
  }

  cancel(slot: Slot): void {
    this.inflight.get(slot)?.ctl.abort();
    this.inflight.delete(slot);
  }
}
