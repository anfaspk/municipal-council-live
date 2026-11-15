import { DestroyRef, Directive, ElementRef, inject, input, output } from '@angular/core';
import { gestureOf, holding, HOLD_MS, type TrackPoint } from './gesture.model';

@Directive({
  selector: '[mjSwipe]',
  host: {
    '[class.mj-swipe-x]': "mjSwipe() === 'x'",
    '[class.mj-swipe-y]': "mjSwipe() === 'y'",
  },
})
export class SwipeDirective {
  readonly mjSwipe = input<'x' | 'y'>('x');
  readonly swipeNext = output<void>();
  readonly swipePrev = output<void>();
  readonly swipeDown = output<void>();
  readonly holdStart = output<void>();
  readonly holdEnd = output<void>();

  constructor() {
    const el: HTMLElement = inject(ElementRef).nativeElement;
    let track: TrackPoint[] = [],
      id: number | null = null,
      held = false,
      timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const point = (e: PointerEvent): TrackPoint => ({ x: e.clientX, y: e.clientY, t: e.timeStamp });
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || id !== null) return;
      id = e.pointerId;
      track = [point(e)];
      held = false;
      el.setPointerCapture?.(e.pointerId);
      clear();
      timer = setTimeout(() => {
        timer = null;
        if (id !== null && holding(track, track[0]!.t + HOLD_MS)) {
          held = true;
          this.holdStart.emit();
        }
      }, HOLD_MS);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      track.push(point(e));
      if (!held && !holding(track, track[0]!.t + HOLD_MS)) clear();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      clear();
      id = null;
      track.push(point(e));
      if (held) {
        held = false;
        this.holdEnd.emit();
        return;
      }
      if (e.type === 'pointercancel') return;
      const rtl = getComputedStyle(el).direction === 'rtl',
        g = gestureOf(track, { rtl, vw: window.innerWidth });
      if (g === 'swipe-next') this.swipeNext.emit();
      else if (g === 'swipe-prev') this.swipePrev.emit();
      else if (g === 'swipe-down') this.swipeDown.emit();
    };
    const menu = (e: Event) => {
      if (id !== null || held) e.preventDefault();
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move, { passive: true });
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', menu);
    inject(DestroyRef).onDestroy(() => {
      clear();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('contextmenu', menu);
    });
  }
}
