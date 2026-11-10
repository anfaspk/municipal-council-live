import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { reducedMotion } from '../motion/reduced-motion';
import { PointerTracker } from '../motion/pointer-tracker.service';
import { LatticeComponent } from './lattice.component';
import { rng } from './ornament';

function stars(n: number, seed: number) {
  const r = rng(seed || 3);
  return Array.from({ length: n }, () => ({
    cx: (r() * 100).toFixed(2) + '%',
    cy: (r() * 100).toFixed(2) + '%',
    r: (r() * 1.1 + 0.25).toFixed(2),
    opacity: (r() * 0.6 + 0.15).toFixed(2),
  }));
}
const STARS = stars(220, 11);

@Component({
  selector: 'div.mj-ambient',
  imports: [LatticeComponent],
  template: `<div class="mj-breathe"></div>
    <svg
      #sky
      class="mj-stars"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      @for (s of stars; track $index) {
        <svg:circle [attr.cx]="s.cx" [attr.cy]="s.cy" [attr.r]="s.r" [attr.opacity]="s.opacity" />
      }</svg
    ><svg mjLattice></svg>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AmbientComponent {
  protected readonly stars = STARS;
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly sky = viewChild.required<ElementRef<SVGElement>>('sky');
  private readonly tracker = inject(PointerTracker);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    afterNextRender(() => this.drift());
  }

  private drift(): void {
    if (this.el.closest('.cc-dash')) return;
    const root = this.el.parentElement!,
      sky = this.sky().nativeElement;
    let drift: string | null = null;
    const tracking = this.tracker.track(root, {
      read: ({ move }) => {
        if (!move || reducedMotion()) return;
        const b = this.tracker.rect(root);
        const x = (move.clientX - b.left) / b.width - 0.5,
          y = (move.clientY - b.top) / b.height - 0.5;
        drift = 'translate(' + (-x * 24).toFixed(1) + 'px,' + (-y * 16).toFixed(1) + 'px)';
      },
      write: () => {
        if (drift !== null) {
          sky.style.transform = drift;
          drift = null;
        }
      },
    });
    this.destroyRef.onDestroy(() => tracking.stop());
  }
}
