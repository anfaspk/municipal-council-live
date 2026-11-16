import { Injectable } from '@angular/core';
import { CWil } from '../../../domain/count/count';
import { drawBootWil } from './draw.model';

export interface DrawWish {
  id: number;
  play: boolean;
}

@Injectable({ providedIn: 'root' })
export class DrawFocus {
  private wish: DrawWish | null = null;
  private back: { gid: string; n: string } | null = null;
  private view: { id: number; full: boolean } | null = null;

  constructor() {
    const id = drawBootWil(location.search);
    if (id !== null) this.wish = { id, play: false };
  }

  open(w: CWil): void {
    this.wish = { id: w.id, play: true };
    this.back = { gid: w.gid, n: w.n };
  }
  take(): DrawWish | null {
    const w = this.wish;
    this.wish = null;
    return w;
  }
  takeBack(): { gid: string; n: string } | null {
    const b = this.back;
    this.back = null;
    return b;
  }

  keep(view: { id: number; full: boolean } | null): void {
    this.view = view;
  }
  kept(): { id: number; full: boolean } | null {
    return this.view;
  }
}
