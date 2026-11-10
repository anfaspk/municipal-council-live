import { afterNextRender, DestroyRef, inject, Injectable, Injector, signal } from '@angular/core';
import { GEO } from '../../../domain/geo/geo.data';
import { DetailAt, readDetail, sameAt, upOf, writeDetail } from './detail-url';

interface Entry {
  dtDepth?: unknown;
  dtFrom?: unknown;
}
const entry = (): Entry =>
  history.state && typeof history.state === 'object' ? history.state : {};
const depthOf = (e: Entry): number =>
  typeof e.dtDepth === 'number' && e.dtDepth > 0 ? e.dtDepth : 0;

@Injectable()
export class DetailState {
  private readonly injector = inject(Injector);
  private readonly govs = Object.keys(GEO.g);

  private readonly _at = signal<DetailAt | null>(readDetail(location.search, this.govs), {
    equal: sameAt,
  });
  readonly at = this._at.asReadonly();
  private opener: HTMLElement | null = null;
  private closing = false;
  move = (_from: DetailAt, _to: DetailAt | null, apply: () => void): void => apply();
  private to: DetailAt | null | undefined;
  private now = (): DetailAt | null => (this.to === undefined ? this._at() : this.to);

  constructor() {
    const pop = () => this.popped(readDetail(location.search, this.govs));
    addEventListener('popstate', pop);
    inject(DestroyRef).onDestroy(() => removeEventListener('popstate', pop));
  }

  open(at: DetailAt): void {
    if (sameAt(at, this.now())) return;
    if (!this.now()) this.opener = activeEl();
    this.go(at, 'push');
  }
  sibling(at: DetailAt): void {
    if (!sameAt(at, this.now())) this.go(at, 'replace');
  }
  up(): void {
    const at = this.now();
    if (!at) return;
    const to = upOf(at);
    if (!to) return this.close();
    const from = entry().dtFrom;
    if (typeof from === 'string' && sameAt(readDetail(from, this.govs), to)) history.back();
    else this.go(to, 'replace');
  }
  close(): void {
    if (!this.now()) return;
    const depth = depthOf(entry());
    if (depth > 0) {
      this.closing = true;
      history.go(-depth);
    } else this.write(null, 'replace');
    this.shut();
  }

  private go(at: DetailAt, how: 'push' | 'replace'): void {
    this.write(at, how);
    this.set(at);
  }
  private set(at: DetailAt | null, then?: () => void): void {
    const from = this._at(),
      apply = () => {
        this.to = undefined;
        this._at.set(at);
        then?.();
      };
    this.to = at;
    if (from) this.move(from, at, apply);
    else apply();
  }
  private write(at: DetailAt | null, how: 'push' | 'replace'): void {
    const e = entry(),
      url = location.pathname + writeDetail(at, location.search) + location.hash;
    if (how === 'push')
      history.pushState({ dtDepth: depthOf(e) + 1, dtFrom: location.search }, '', url);
    else history.replaceState(at ? { ...e } : {}, '', url);
  }
  private popped(next: DetailAt | null): void {
    if (this.closing) {
      this.closing = false;
      if (next) this.write(null, 'replace');
      next = null;
    }
    if (!next) return this.shut();
    if (!this.now()) this.opener = activeEl();
    if (!sameAt(next, this.now())) this.set(next);
  }
  private shut(): void {
    if (!this.now()) return;
    const el = this.opener;
    this.opener = null;
    this.set(null, () =>
      afterNextRender(
        () => {
          const to = el?.isConnected
            ? el
            : document.querySelector<HTMLElement>('.mj-drawer .dclose');
          to?.focus({ preventScroll: true });
        },
        { injector: this.injector },
      ),
    );
  }
}

const activeEl = (): HTMLElement | null =>
  document.activeElement instanceof HTMLElement && document.activeElement !== document.body
    ? document.activeElement
    : null;
