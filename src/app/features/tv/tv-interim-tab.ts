import { Injectable, signal } from '@angular/core';

export type InterimTabKey = 'inter' | 'info';
@Injectable({ providedIn: 'root' })
export class TvInterimTab {
  readonly tab = signal<InterimTabKey>('inter');
}
