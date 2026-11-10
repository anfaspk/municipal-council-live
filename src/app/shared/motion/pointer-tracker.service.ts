import { inject, Injectable } from '@angular/core';
import { FrameHandle, FrameLoop } from './frame-loop.service';

export interface PointerSample {
  move: PointerEvent | null;
  last: PointerEvent;
}

export interface PointerTask {
  read?(sample: PointerSample): void;
  write?(): void;
}

interface Root {
  tasks: Set<PointerTask>;
  move: PointerEvent | null;
  last: PointerEvent | null;
  frame: FrameHandle | null;
  rect: DOMRect | null;
  detach(): void;
}

@Injectable({ providedIn: 'root' })
export class PointerTracker {
  private readonly frames = inject(FrameLoop);
  private readonly roots = new Map<HTMLElement, Root>();

  track(el: HTMLElement, task: PointerTask): { stop(): void } {
    const root = this.roots.get(el) ?? this.attach(el);
    root.tasks.add(task);
    return {
      stop: () => {
        root.tasks.delete(task);
        if (root.tasks.size) return;
        root.frame?.stop();
        root.detach();
        this.roots.delete(el);
      },
    };
  }

  rect(el: HTMLElement): DOMRect {
    const root = this.roots.get(el);
    if (!root) return el.getBoundingClientRect();
    return (root.rect ??= el.getBoundingClientRect());
  }

  private attach(el: HTMLElement): Root {
    const root: Root = {
      tasks: new Set(),
      move: null,
      last: null,
      frame: null,
      rect: null,
      detach: () => undefined,
    };
    const frame = {
      read: () => {
        const sample = { move: root.move, last: root.last! };
        root.move = root.last = null;
        root.frame = null;
        root.tasks.forEach((t) => t.read?.(sample));
      },
      write: () => root.tasks.forEach((t) => t.write?.()),
    };
    const record = (e: Event) => {
      const p = e as PointerEvent;
      if (p.type === 'pointermove') root.move = p;
      root.last = p;
      root.frame ??= this.frames.once(frame);
    };
    const stale = () => {
      root.rect = null;
    };
    const resize = new ResizeObserver(stale);
    const opts = { passive: true };
    el.addEventListener('pointermove', record, opts);
    el.addEventListener('pointerout', record, opts);
    el.addEventListener('pointerleave', record, opts);
    window.addEventListener('resize', stale, opts);
    resize.observe(el);
    root.detach = () => {
      el.removeEventListener('pointermove', record);
      el.removeEventListener('pointerout', record);
      el.removeEventListener('pointerleave', record);
      window.removeEventListener('resize', stale);
      resize.disconnect();
    };
    this.roots.set(el, root);
    return root;
  }
}
