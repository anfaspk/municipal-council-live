import { signal } from '@angular/core';

const query =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const reduced = signal(!!query?.matches);
query?.addEventListener('change', (e) => reduced.set(e.matches));

export const reducedMotion = reduced.asReadonly();
