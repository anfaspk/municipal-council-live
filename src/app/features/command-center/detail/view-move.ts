import { afterNextRender, Injector } from '@angular/core';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { DetailAt } from './detail-url';

interface ViewTransition {
  ready: Promise<void>;
  finished: Promise<void>;
}
type Starts = Document & {
  startViewTransition?: (update: () => Promise<void>) => ViewTransition;
};

const WAIT = 600;

export function viewMove(injector: Injector) {
  return (from: DetailAt, to: DetailAt | null, apply: () => void): void => {
    const doc = document as Starts;
    if (!doc.startViewTransition || reducedMotion() || document.hidden) return apply();
    const html = document.documentElement,
      head = from.vil !== undefined && to?.vil !== undefined;
    html.classList.add('dt-vt');
    html.classList.toggle('dt-vt-head', head);
    const t = doc.startViewTransition(
      () =>
        new Promise<void>((done) => {
          apply();
          afterNextRender(() => done(), { injector });
          setTimeout(done, WAIT);
        }),
    );
    t.ready.catch(() => undefined);
    void t.finished.finally(() => html.classList.remove('dt-vt', 'dt-vt-head'));
  };
}
