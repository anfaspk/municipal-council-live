import { DestroyRef, ElementRef, inject, Signal, signal } from '@angular/core';
import { Box, NO_BOX } from './chart';

export function boxOf(): Signal<Box> {
  const el: Element = inject(ElementRef).nativeElement,
    box = signal<Box>(NO_BOX);
  if (typeof ResizeObserver === 'undefined') return box.asReadonly();
  const ro = new ResizeObserver((entries) => {
    const r = entries[entries.length - 1]?.contentRect;
    if (!r) return;
    const w = Math.round(r.width),
      h = Math.round(r.height),
      b = box();
    if (w !== b.w || h !== b.h) box.set({ w, h });
  });
  ro.observe(el);
  inject(DestroyRef).onDestroy(() => ro.disconnect());
  return box.asReadonly();
}
