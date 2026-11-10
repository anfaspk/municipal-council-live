import { Injectable, signal } from '@angular/core';

@Injectable()
export class TvSlideState {
  readonly spot = signal(-1);
}
