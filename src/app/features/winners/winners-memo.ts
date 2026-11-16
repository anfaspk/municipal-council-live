import { effect, Injectable, untracked } from '@angular/core';

export interface WinnersAt {
  gov: string | null;
  wil: number | null;
  paused: boolean;
}

@Injectable({ providedIn: 'root' })
export class WinnersMemo {
  private at: WinnersAt | null = null;
  q = '';

  follow(
    open: () => boolean,
    gov: () => string | null,
    wil: () => number | null,
    paused: () => boolean,
  ): void {
    effect(() => {
      const a = { gov: gov(), wil: wil(), paused: paused() };
      if (open()) untracked(() => this.keep(a));
    });
  }
  private keep(a: WinnersAt): void {
    if (a.gov !== this.at?.gov) this.q = '';
    this.at = a;
  }
  kept(): WinnersAt | null {
    return this.at;
  }
  clear(): void {
    this.at = null;
    this.q = '';
  }
}
