import { afterNextRender, type Injector } from '@angular/core';
import { reducedMotion } from './reduced-motion';

interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
}
type Starts = Document & { startViewTransition?: (update: () => Promise<void>) => ViewTransition };

const WAIT = 600;

export function viewSwap(apply: () => void, injector: Injector): void {
  const doc = document as Starts,
    html = document.documentElement;
  if (
    reducedMotion() ||
    typeof doc.startViewTransition !== 'function' ||
    document.hidden ||
    html.classList.contains('dt-vt')
  )
    return apply();
  html.classList.add('mj-vt');
  const t = doc.startViewTransition(
    () =>
      new Promise<void>((done) => {
        apply();
        afterNextRender(() => done(), { injector });
        setTimeout(done, WAIT);
      }),
  );
  t.ready.catch(() => undefined);
  void t.finished.finally(() => html.classList.remove('mj-vt'));
}
