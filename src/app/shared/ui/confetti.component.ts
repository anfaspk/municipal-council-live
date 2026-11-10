import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { starPoints } from './ornament';
import { ConfettiBurst } from './toast.service';

const STAR = starPoints(12, 12, 11);

@Component({
  selector: 'div.mj-confetti',
  template: `@for (p of burst().pieces; track $index) {
    <svg
      viewBox="0 0 24 24"
      [style.width.px]="p.size"
      [style.height.px]="p.size"
      [style.left.px]="p.x"
      [style.top.px]="p.y"
    >
      <svg:polygon [attr.points]="star" [style.fill]="p.fill" />
    </svg>
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfettiComponent {
  readonly burst = input.required<ConfettiBurst>();
  protected readonly star = STAR;
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  constructor() {
    afterNextRender(() => {
      const pieces = this.burst().pieces;
      this.host.querySelectorAll('svg').forEach((s, i) =>
        s.animate(pieces[i]!.flight, {
          duration: pieces[i]!.ms,
          easing: 'cubic-bezier(.16,1,.3,1)',
        }),
      );
    });
  }
}
