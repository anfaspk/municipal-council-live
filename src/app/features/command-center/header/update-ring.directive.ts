import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenUpdates } from '../../screens/screen-updates';

@Directive({ selector: '.cc-upd' })
export class UpdateRingDirective implements AfterViewInit {
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly stats = inject(TurnoutStore);
  private readonly updates = inject(ScreenUpdates);
  private readonly destroyRef = inject(DestroyRef);
  private ring?: Animation;

  ngAfterViewInit(): void {
    this.restart();
    this.updates.now.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      if (e.type === 'pull' || e.type === 'complete') this.restart();
    });
  }

  private restart(): void {
    const cd = this.el.querySelector<SVGCircleElement>('.cd');
    if (!cd) return;
    this.ring?.cancel();
    if (this.stats.done()) {
      cd.setAttribute('stroke-dasharray', '0 100');
      return;
    }
    this.ring = cd.animate([{ strokeDasharray: '100 100' }, { strokeDasharray: '0 100' }], {
      duration: this.stats.every,
      easing: 'linear',
      fill: 'forwards',
    });
  }
}
