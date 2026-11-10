import { effect, inject, untracked } from '@angular/core';
import { ScreenState } from '../../core/screen/screen.state';
import { CountStore } from '../../data/count.store';
import { govPublished, natPublished } from '../../domain/count/diff';

export function handOffToWinners(): void {
  const screen = inject(ScreenState),
    feed = inject(CountStore);
  let handed = false;
  effect(() => {
    if (handed || !screen.is('wall')) return;
    const r = screen.region();
    if (r === 'nat' ? !natPublished(feed.govs) : !govPublished(feed.gov(r))) return;
    handed = true;
    untracked(() => screen.showWinners(r));
  });
}
