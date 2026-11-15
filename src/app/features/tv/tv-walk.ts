import { Injectable, signal } from '@angular/core';
import { SlideClock } from '../../shared/motion/slide-clock';

@Injectable()
export class TvWalk {
  readonly clock = new SlideClock();

  readonly shown = signal(0);

  readonly onView = signal<number | null>(null);

  left: () => number = () => 0;

  wait: (ms: number) => void = () => undefined;

  still: () => boolean = () => true;
}
