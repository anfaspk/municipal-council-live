import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { InterimStore } from '../../../data/interim.store';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { Cue, cueOf } from './interim-cue.model';

@Injectable({ providedIn: 'root' })
export class InterimCue {
  private readonly store = inject(InterimStore);
  readonly cue = computed<Cue>(() => cueOf(this.store.phase(), this.store.left()));
  readonly left = this.store.left;
  readonly fromAt = this.store.fromAt;
  readonly landing = signal(false);
  private was: Cue = 'off';

  constructor() {
    this.store.watch(this, true);
    effect(() => {
      const cue = this.cue();
      untracked(() => {
        if (this.was === 'count' && cue === 'open' && !reducedMotion()) this.landing.set(true);
        if (cue === 'count') this.landing.set(false);
        this.was = cue;
      });
    });
  }
}
