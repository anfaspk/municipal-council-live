import {
  afterNextRender,
  DestroyRef,
  effect,
  inject,
  Injector,
  type Signal,
  untracked,
} from '@angular/core';
import type { ScreenComp } from '../../../core/screen/layout.model';
import { CountStore } from '../../../data/count.store';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { ListPager } from '../../../shared/motion/list-pager';
import { SlideClock } from '../../../shared/motion/slide-clock';
import type { CfWalk } from './cf-walk';
import type { Place } from './count-flow.model';
import { CountView } from './count.view';

export function signageWalk(o: {
  host: HTMLElement;
  comp: Signal<ScreenComp>;
  open: Signal<boolean>;
  counting: Signal<boolean>;
  walk: CfWalk;
  secs: Signal<number>;
  still: Signal<boolean>;
  place: Signal<Place>;
}): void {
  const view = inject(CountView),
    store = inject(CountStore),
    injector = inject(Injector),
    clock = new SlideClock(),
    pager = new ListPager(inject(FrameLoop), clock, 'wall');
  const rest = (): HTMLElement | null => {
    const el = o.host.querySelector<HTMLElement>('.cf-wil .cf-rest');
    el?.setAttribute('data-pages', '');
    return el;
  };
  effect(() => {
    const run = o.open() && o.comp() === 'sign' && o.counting() && view.ready();
    if (run && !untracked(() => o.walk.on()))
      untracked(() => o.walk.start(store.govs, o.secs(), o.place()));
  });
  effect(() => {
    const s = o.walk.step(),
      on = o.comp() === 'sign' && o.walk.on() && s?.place.k === 'wil' && !!view.board();
    untracked(() => {
      pager.stop();
      clock.reset();
      if (!on || !s) return;
      clock.start();
      afterNextRender(
        () =>
          pager.run(rest, {
            time: s.ms,
            travel: !o.still(),
            wait: (ms) => o.walk.extend(ms),
          }),
        { injector },
      );
    });
  });
  inject(DestroyRef).onDestroy(() => {
    pager.stop();
    clock.reset();
  });
}
