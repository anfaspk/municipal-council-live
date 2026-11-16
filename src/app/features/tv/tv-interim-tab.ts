import { inject, Injectable, signal } from '@angular/core';
import { ServerClock } from '../../core/clock/server-clock.service';

export type InterimTabKey = 'inter' | 'info';
@Injectable({ providedIn: 'root' })
export class TvInterimTab {
  private readonly clock = inject(ServerClock);
  readonly tab = signal<InterimTabKey>('inter');
  private seen: number | null = null;

  open(): void {
    const from = this.clock.interimFrom();
    if (from === this.seen) return;
    this.seen = from;
    this.tab.set('inter');
  }
  reset(): void {
    this.seen = null;
  }
}
