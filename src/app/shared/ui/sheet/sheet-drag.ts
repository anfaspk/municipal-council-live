import { speedOf, type TrackPoint } from '../../motion/gesture.model';

export interface DragTarget {
  offset(): number;
  full(): number;
  move(offset: number): void;
  end(height: number, speed: number): void;
}

export function sheetDrag(bar: HTMLElement, to: DragTarget): () => void {
  let id: number | null = null,
    start = 0,
    from = 0,
    track: TrackPoint[] = [];
  const down = (e: PointerEvent) => {
    if (id !== null || (e.target as Element).closest('button')) return;
    id = e.pointerId;
    start = e.clientY;
    from = to.offset();
    track = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    bar.setPointerCapture?.(e.pointerId);
  };
  const off = (y: number) => Math.max(0, Math.min(to.full(), from + y - start));
  const move = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    track.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    to.move(off(e.clientY));
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== id) return;
    id = null;
    track.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    if (Math.abs(e.clientY - start) < 4 && e.type !== 'pointercancel') return to.move(from);
    to.end(to.full() - off(e.clientY), speedOf(track, 'y'));
  };
  bar.addEventListener('pointerdown', down);
  bar.addEventListener('pointermove', move, { passive: true });
  bar.addEventListener('pointerup', up);
  bar.addEventListener('pointercancel', up);
  return () => {
    bar.removeEventListener('pointerdown', down);
    bar.removeEventListener('pointermove', move);
    bar.removeEventListener('pointerup', up);
    bar.removeEventListener('pointercancel', up);
  };
}
