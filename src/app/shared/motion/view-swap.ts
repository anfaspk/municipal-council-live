import { reducedMotion } from './reduced-motion';

export function viewSwap(apply: () => void): void {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (reducedMotion() || typeof doc.startViewTransition !== 'function') return apply();
  doc.startViewTransition(apply);
}
