export interface TvPointerHooks {
  wake(): void;
  dock(over: boolean): void;
}

export function watchTvPointer(el: HTMLElement, h: TvPointerHooks): void {
  el.addEventListener('pointermove', (e) => {
    h.wake();
    h.dock(e.pointerType === 'mouse' && !!(e.target as Element).closest?.('.tva-dock'));
  });
  el.addEventListener('pointerleave', () => h.dock(false));
  el.addEventListener('pointerdown', () => h.wake());
  el.addEventListener('focusin', () => h.wake());
}
