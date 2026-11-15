import { Injectable, signal } from '@angular/core';
import { FOLLOW_KEY, parseFollow, sameFollow, type Follow } from './follow-place';

@Injectable({ providedIn: 'root' })
export class FollowPref {
  private readonly _place = signal<Follow | null>(load());
  readonly place = this._place.asReadonly();

  is(f: Follow): boolean {
    return sameFollow(this._place(), f);
  }
  toggle(f: Follow): void {
    const next = this.is(f) ? null : { gov: f.gov, wil: f.wil };
    this._place.set(next);
    try {
      if (next) localStorage.setItem(FOLLOW_KEY, JSON.stringify(next));
      else localStorage.removeItem(FOLLOW_KEY);
    } catch {
    }
  }
}

function load(): Follow | null {
  try {
    return parseFollow(localStorage.getItem(FOLLOW_KEY));
  } catch {
    return null;
  }
}
