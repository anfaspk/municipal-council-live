import { TouchHold } from '../../shared/motion/touch-hold';

export interface TvPointerHooks {
  wake(): void;
  dock(over: boolean): void;
}

export function watchTvPointer(el: HTMLElement, h: TvPointerHooks): void {
  const hold = new TouchHold((on) => h.dock(on));
  const onDock = (e: Event) => !!(e.target as Element).closest?.('.tva-dock');
  el.addEventListener('pointermove', (e) => {
    h.wake();
    if (e.pointerType === 'mouse') h.dock(onDock(e));
  });
  el.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') h.dock(false);
  });
  el.addEventListener('pointerdown', (e) => {
    h.wake();
    if (e.pointerType !== 'mouse' && onDock(e)) hold.on();
  });
  for (const t of ['pointerup', 'pointercancel'] as const)
    el.addEventListener(t, (e) => {
      if (e.pointerType !== 'mouse' && onDock(e)) hold.off(e);
    });
  el.addEventListener('focusin', () => h.wake());
}
