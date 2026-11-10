import { inject, Injectable, signal } from '@angular/core';
import { name } from '../domain/format';
import { Gov } from '../domain/stats/stats';
import { TurnoutStore } from './turnout.store';

export type Tick =
  | { kind: 'counted'; time: string; gov: string; votes: number }
  | { kind: 'passes'; time: string; gov: string; p: number }
  | { kind: 'final'; time: string; turnout: number };

const KEEP = 14;

@Injectable({ providedIn: 'root' })
export class TickerStore {
  private readonly turnout = inject(TurnoutStore);
  private readonly _ticks = signal<Tick[]>([]);
  private readonly _latest = signal<Tick | null>(null);
  readonly ticks = this._ticks.asReadonly();
  readonly latest = this._latest.asReadonly();

  constructor() {
    this.seed();
    let rise: { gov: Gov; delta: number } | null = null;
    this.turnout.events.subscribe((e) => {
      const time = this.turnout.clockStr();
      if (e.type === 'change') {
        if (e.delta > 0 && (!rise || e.delta > rise.delta)) rise = { gov: e.gov, delta: e.delta };
      } else if (e.type === 'cross') {
        this.add({ kind: 'passes', time, gov: name(e.gov), p: e.p });
      } else if (e.type === 'pull') {
        if (rise) this.add({ kind: 'counted', time, gov: name(rise.gov), votes: rise.gov.voted });
        rise = null;
      } else if (e.type === 'complete') {
        this.add({ kind: 'final', time, turnout: this.turnout.turnout() });
      }
    });
  }

  private seed(): void {
    const time = this.turnout.clockStr();
    this._ticks.set(
      this.turnout
        .govs()
        .slice()
        .sort((a, b) => b.voted - a.voted)
        .slice(0, 5)
        .map((g) => ({ kind: 'counted', time, gov: name(g), votes: g.voted })),
    );
  }

  private add(tick: Tick): void {
    this._ticks.update((a) => [tick, ...a].slice(0, KEEP));
    this._latest.set(tick);
  }
}
