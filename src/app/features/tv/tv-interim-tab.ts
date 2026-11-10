import { Injectable, signal } from '@angular/core';

export type InterimTabKey = 'inter' | 'info';
@Injectable()
export class TvInterimTab {
  readonly tab = signal<InterimTabKey>('inter');
}
