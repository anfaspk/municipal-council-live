import { DestroyRef, Directive, ElementRef, inject, OnInit } from '@angular/core';
import { PointerSample, PointerTracker } from './pointer-tracker.service';
import { reducedMotion } from './reduced-motion';

const closest = (node: EventTarget | null, selector: string): HTMLElement | null =>
  node instanceof Element ? node.closest<HTMLElement>(selector) : null;

@Directive({ selector: '[mjSpotlight]' })
export class SpotlightDirective implements OnInit {
  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  private readonly tracker = inject(PointerTracker);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    let lit: HTMLElement | null = null,
      next: HTMLElement | null = null,
      at: [number, number] | null = null,
      changed = false;
    const read = ({ move, last }: PointerSample) => {
      if (last.type === 'pointerleave') {
        next = null;
        changed = true;
        return;
      }
      if (!move) return;
      const g = closest(move.target, '.mj-glass');
      next = g;
      changed = true;
      at = null;
      if (!g) return;
      const b = g.getBoundingClientRect(),
        sx = b.width / g.offsetWidth || 1;
      at = [(move.clientX - b.left) / sx, (move.clientY - b.top) / sx];
    };
    const write = () => {
      if (!changed) return;
      changed = false;
      if (lit && lit !== next) lit.classList.remove('is-lit');
      lit = next;
      if (!lit || !at) return;
      lit.style.setProperty('--mx', at[0] + 'px');
      lit.style.setProperty('--my', at[1] + 'px');
      lit.classList.add('is-lit');
    };
    const tracking = this.tracker.track(this.root, { read, write });
    this.destroyRef.onDestroy(() => tracking.stop());
  }
}

@Directive({ selector: '[mjMagnetic]' })
export class MagneticDirective implements OnInit {
  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  private readonly tracker = inject(PointerTracker);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    let drawn: HTMLElement | null = null,
      reset: HTMLElement | null = null,
      shift: string | null = null;
    const read = ({ move, last }: PointerSample) => {
      const where = closest(
        last.type === 'pointermove' ? last.target : last.relatedTarget,
        '.mj-btn',
      );
      if (drawn && drawn !== where) {
        reset = drawn;
        drawn = null;
      }
      const b = move && closest(move.target, '.mj-btn');
      if (!move || !b || b !== where || reducedMotion()) return;
      const r = b.getBoundingClientRect();
      const dx = (move.clientX - r.left - r.width / 2) / r.width,
        dy = (move.clientY - r.top - r.height / 2) / r.height;
      drawn = b;
      shift = (dx * 5).toFixed(1) + 'px ' + (dy * 4).toFixed(1) + 'px';
    };
    const write = () => {
      if (reset) {
        reset.style.translate = '';
        reset = null;
      }
      if (drawn && shift !== null) {
        drawn.style.translate = shift;
        shift = null;
      }
    };
    const tracking = this.tracker.track(this.root, { read, write });
    this.destroyRef.onDestroy(() => tracking.stop());
  }
}
