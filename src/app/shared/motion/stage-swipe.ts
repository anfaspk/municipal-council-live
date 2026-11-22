import { gestureOf, type TrackPoint } from './gesture.model';

const OWN =
  'button, select, input, a[href], [data-pages], .rs-grid, .wn-wils, .cxd-rows, .tv-ih-rest';

export function watchStageSwipe(el: HTMLElement, go: (step: 1 | -1) => void): () => void {
  let id: number | null = null,
    track: TrackPoint[] = [];
  const point = (e: PointerEvent): TrackPoint => ({ x: e.clientX, y: e.clientY, t: e.timeStamp });
  const down = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' || id !== null) return;
    if ((e.target as Element | null)?.closest?.(OWN)) return;
    id = e.pointerId;
    track = [point(e)];
  };
  const move = (e: PointerEvent) => {
    if (e.pointerId === id) track.push(point(e));
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    if (e.type === 'pointercancel') return;
    track.push(point(e));
    const g = gestureOf(track, {
      rtl: getComputedStyle(el).direction === 'rtl',
      vw: window.innerWidth,
    });
    if (g === 'swipe-next') go(1);
    else if (g === 'swipe-prev') go(-1);
  };
  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move, { passive: true });
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
  };
}
