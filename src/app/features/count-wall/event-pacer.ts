import { CEvent } from '../../domain/count/count';
import { CountEvent, CountEventType } from '../../domain/count/diff';
import { HOLD_SLACK } from '../../shared/motion/update-gate';

export type PacedEvent =
  { type: CountEventType; e: CEvent } | { type: 'pull' } | { type: 'complete' };

interface Item {
  after: number;
  fire: () => void;
}

export class EventPacer {
  private queue: Item[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private holdT: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly every: number,
    private readonly resolve: (e: CountEvent) => CEvent,
    private readonly emit: (ev: PacedEvent) => void,
  ) {}

  deliver(events: readonly CountEvent[], complete: boolean): void {
    const n = events.length,
      gap = n ? Math.min(420, (this.every * 0.78) / n) : 0;
    events.forEach((e, i) =>
      this.queue.push({
        after: i ? gap : 0,
        fire: () => this.emit({ type: e.type, e: this.resolve(e) }),
      }),
    );
    this.queue.push({
      after: (n ? gap : 0) + 60,
      fire: () => {
        this.emit({ type: 'pull' });
        if (complete) this.emit({ type: 'complete' });
      },
    });
    this.next();
  }

  hold(ms: number): void {
    if (this.holdT !== null) clearTimeout(this.holdT);
    this.holdT = setTimeout(() => this.release(), Math.max(0, ms) + HOLD_SLACK);
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }
  release(): void {
    if (this.holdT === null) return;
    clearTimeout(this.holdT);
    this.holdT = null;
    const head = this.queue[0];
    if (head) head.after = 0;
    this.next();
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    if (this.holdT !== null) clearTimeout(this.holdT);
    this.timer = this.holdT = null;
    this.queue = [];
  }

  get pending(): number {
    return this.queue.length;
  }
  get holding(): boolean {
    return this.holdT !== null;
  }

  private next(): void {
    const item = this.queue[0];
    if (this.timer !== null || this.holdT !== null || !item) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.queue.shift();
      item.fire();
      this.next();
    }, item.after);
  }
}
