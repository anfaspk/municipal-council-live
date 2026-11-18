import { afterRenderEffect, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';

const MIN_SCALE = 0.5;

/** Shrinks the host's font-size (down to MIN_SCALE of its CSS size) so its text fits on one line. */
@Directive({ selector: '[mjFitLine]', host: { class: 'mj-fit-line' } })
export class FitLineDirective {
  /** The text being fitted — pass it so a change re-fits. */
  readonly mjFitLine = input<unknown>();
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private width = -1;
  private raf = 0;

  constructor() {
    afterRenderEffect(() => {
      this.mjFitLine();
      this.fit();
    });
    const ro =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(([e]) => {
            const w = Math.round(e!.contentRect.width);
            if (w === this.width) return;
            this.width = w;
            this.queue();
          })
        : null;
    ro?.observe(this.el);
    document.fonts?.ready.then(() => this.queue());
    inject(DestroyRef).onDestroy(() => {
      ro?.disconnect();
      cancelAnimationFrame(this.raf);
    });
  }

  private queue(): void {
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => this.fit());
  }

  private fit(): void {
    const el = this.el;
    el.style.removeProperty('font-size');
    const room = el.clientWidth,
      need = el.scrollWidth;
    if (!room || need <= room) return;
    const base = parseFloat(getComputedStyle(el).fontSize),
      min = base * MIN_SCALE;
    let size = Math.max(min, Math.floor(base * (room / need) * 10) / 10);
    el.style.fontSize = size + 'px';
    while (size > min && el.scrollWidth > el.clientWidth) {
      size = Math.max(min, size - 0.5);
      el.style.fontSize = size + 'px';
    }
  }
}
