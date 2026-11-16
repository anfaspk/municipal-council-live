import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { fullscreenOffered } from './layout.model';
import { ViewportState } from './viewport.state';

export interface FullscreenHost {
  enabled: boolean;
  active(): boolean;
  enter(): Promise<void>;
  exit(): Promise<void>;
  listen(fn: () => void): () => void;
}

export const FULLSCREEN_HOST = new InjectionToken<FullscreenHost>('fullscreen host', {
  providedIn: 'root',
  factory: browserFullscreenHost,
});

@Injectable({ providedIn: 'root' })
export class Fullscreen {
  private readonly host = inject(FULLSCREEN_HOST);
  private readonly viewport = inject(ViewportState);
  private readonly _on = signal(this.host.active());
  readonly on = this._on.asReadonly();
  readonly offered = computed(() =>
    fullscreenOffered(this.host.enabled, this.viewport.display(), this.on()),
  );

  constructor() {
    this.host.listen(() => this._on.set(this.host.active()));
  }

  toggle(): void {
    if (!this.host.enabled) return;
    void (this.host.active() ? this.host.exit() : this.host.enter()).catch(() => undefined);
  }
}

function browserFullscreenHost(): FullscreenHost {
  const d = document;
  return {
    enabled: !!d.fullscreenEnabled && typeof d.documentElement.requestFullscreen === 'function',
    active: () => !!d.fullscreenElement,
    enter: () => d.documentElement.requestFullscreen(),
    exit: () => d.exitFullscreen(),
    listen(fn) {
      d.addEventListener('fullscreenchange', fn);
      return () => d.removeEventListener('fullscreenchange', fn);
    },
  };
}
