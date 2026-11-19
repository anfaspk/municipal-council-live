import { DestroyRef, effect, inject, untracked } from '@angular/core';
import { ScreenState } from '../../core/screen/screen.state';
import { CountStore } from '../../data/count.store';
import { govPublished, natPublished } from '../../domain/count/diff';

export function handOffToWinners(): void {
  const screen = inject(ScreenState),
    feed = inject(CountStore);
  let handed = false;
  const due = (): boolean => {
    if (handed || !screen.is('wall')) return false;
    const r = screen.region();
    return r === 'nat' ? natPublished(feed.govs) : govPublished(feed.gov(r));
  };
  inject(DestroyRef).onDestroy(feed.holdDetails(() => untracked(due)));
  effect(() => {
    if (!due()) return;
    handed = true;
    untracked(() => screen.showWinners(screen.region()));
  });
}
