import { DestroyRef, Directive, effect, ElementRef, inject, input, untracked } from '@angular/core';
import { easeExpo } from '../../../../shared/motion/easing';
import { FRAME_SCOPE, FrameHandle, FrameLoop } from '../../../../shared/motion/frame-loop.service';
import { tween } from '../../../../shared/motion/tween';
import { mixPath } from './chart';

@Directive({ selector: 'path[dtD]' })
export class EasePathDirective {
  readonly d = input.required<string>({ alias: 'dtD' });
  private readonly el: SVGPathElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  private shown = '';
  private job: FrameHandle | null = null;

  constructor() {
    effect(() => {
      const to = this.d();
      untracked(() => this.go(to));
    });
    inject(DestroyRef).onDestroy(() => this.job?.stop());
  }

  private go(to: string): void {
    const from = this.shown;
    this.job?.stop();
    this.job = null;
    if (!from || mixPath(from, to, 0) === null) {
      this.set(to);
      return;
    }
    this.job = tween(
      this.frames,
      900,
      (k) => this.set(mixPath(from, to, k) ?? to),
      null,
      easeExpo,
      this.scope,
    );
  }
  private set(d: string): void {
    this.shown = d;
    if (d) this.el.setAttribute('d', d);
    else this.el.removeAttribute('d');
  }
}
