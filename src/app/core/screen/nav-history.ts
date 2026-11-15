import { DestroyRef, inject, Injectable } from '@angular/core';
import {
  asState,
  backOver,
  type NavOwner,
  type NavState,
  ownersOf,
  popOf,
  pushedState,
  replacedState,
  stackOf,
} from './nav-history.model';

@Injectable({ providedIn: 'root' })
export class NavHistory {
  private stack = stackOf(history.state);
  private readonly owners = new Map<NavOwner, () => void>();

  constructor() {
    const pop = () => {
      const to = stackOf(history.state),
        p = popOf(this.stack, to);
      this.stack = to;
      for (const o of ownersOf(p)) this.owners.get(o)?.();
    };
    addEventListener('popstate', pop);
    inject(DestroyRef).onDestroy(() => removeEventListener('popstate', pop));
  }

  get state(): NavState {
    return asState(history.state);
  }
  listen(owner: NavOwner, popped: () => void): () => void {
    this.owners.set(owner, popped);
    return () => {
      if (this.owners.get(owner) === popped) this.owners.delete(owner);
    };
  }
  push(owner: NavOwner, own: object, url: string): void {
    history.pushState(pushedState(history.state, owner, own), '', url);
    this.stack = stackOf(history.state);
  }
  replace(own: object, url: string): void {
    history.replaceState(replacedState(history.state, own), '', url);
  }
  back(owner: NavOwner): number {
    const n = backOver(stackOf(history.state), owner);
    if (n) history.go(-n);
    return n;
  }
}
