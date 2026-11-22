import { DestroyRef, effect, inject, untracked } from '@angular/core';
import { ScreenState } from '../../core/screen/screen.state';
import { CountStore } from '../../data/count.store';
import { govPublished, natPublished } from '../../domain/count/diff';

export function handOffToWinners(): void {
  const screen = inject(ScreenState),
    feed = inject(CountStore);
  let handed = false;
  let seen: { r: string; done: boolean } | null = null;
  const now = (answered = feed.ready()): { r: string; done: boolean } | null => {
    if (handed || !screen.is('wall') || !answered) return null;
    const r = screen.region();
    return { r, done: r === 'nat' ? natPublished(feed.govs) : govPublished(feed.gov(r)) };
  };
  const due = (n: { r: string; done: boolean } | null): boolean =>
    !!n?.done && (seen?.r === n.r ? !seen.done : !screen.chosen());
  inject(DestroyRef).onDestroy(feed.holdDetails(() => untracked(() => due(now(true)))));
  effect(() => {
    const n = now(),
      go = due(n);
    seen = n;
    if (!go) return;
    handed = true;
    untracked(() => screen.showWinners(screen.region()));
  });
}
