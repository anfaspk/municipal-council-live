import { computed, inject, Injectable, signal } from '@angular/core';
import { ViewportState } from './viewport.state';

interface Offer extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export type InstallHint = 'prompt' | 'ios' | null;

@Injectable({ providedIn: 'root' })
export class InstallOffer {
  private readonly viewport = inject(ViewportState);
  private offer: Offer | null = null;
  private readonly offered = signal(false);
  private readonly installed = signal(false);
  private readonly ios = (navigator as { standalone?: boolean }).standalone === false;
  readonly hint = computed<InstallHint>(() =>
    this.viewport.display() !== 'browser' || this.installed()
      ? null
      : this.offered()
        ? 'prompt'
        : this.ios
          ? 'ios'
          : null,
  );

  constructor() {
    addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.offer = e as Offer;
      this.offered.set(true);
    });
    addEventListener('appinstalled', () => {
      this.offer = null;
      this.offered.set(false);
      this.installed.set(true);
    });
  }

  async ask(): Promise<void> {
    const o = this.offer;
    if (!o) return;
    this.offer = null;
    this.offered.set(false);
    try {
      await o.prompt();
      if ((await o.userChoice).outcome === 'accepted') this.installed.set(true);
    } catch {
    }
  }
}
