import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TvMemo {
  key: string | null = null;
  lit = -1;

  keep(key: string, lit = -1): void {
    this.key = key;
    this.lit = lit;
  }
  clear(): void {
    this.key = null;
    this.lit = -1;
  }
}
