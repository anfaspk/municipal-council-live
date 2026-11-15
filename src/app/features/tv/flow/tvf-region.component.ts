import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { PHONE_REGION } from './tv-flow.model';
import { TvView } from '../tv.view';
import { tvf } from './tvf-strings';

@Component({
  selector: 'div[tvfRegion]',
  host: { class: 'tvf-region', '[class.pick]': 'pick()', dir: 'ltr' },
  template: `@if (view.region(); as m) {<svg [attr.viewBox]="m.viewBox" role="img" [attr.aria-label]="label()">
    <path class="sh" [attr.d]="m.d"/>
    @for (p of m.pts; track p.i) {<g class="pt" [class]="p.band" [class.lit]="lit() === p.i" [attr.data-w]="pick() ? p.i : null" (click)="choose(p.i)">
      @if (pick()) {<circle class="hit" [attr.cx]="p.cx" [attr.cy]="p.cy" [attr.r]="hit(p.hit)"/>}
      <circle class="dot" [attr.cx]="p.cx" [attr.cy]="p.cy" [attr.r]="p.r"/>
      @if (lit() === p.i) {<circle class="ring" [attr.cx]="p.cx" [attr.cy]="p.cy" [attr.r]="p.ring"/>}
    </g>}
  </svg>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfRegionComponent {
  protected readonly view = inject(TvView);
  readonly pick = input(false);
  readonly picked = output<number>();
  protected readonly lit = this.view.lit;
  protected readonly label = computed(() =>
    tvf(this.pick() ? 'tvfRegionL' : 'tvfRegionN', { g: this.view.gov()?.name ?? '' }),
  );
  private readonly scale = signal(1);
  constructor() {
    const el: HTMLElement = inject(ElementRef).nativeElement;
    if (typeof ResizeObserver !== 'function') return;
    const ro = new ResizeObserver(() => {
      const r = el.querySelector('svg')?.getBoundingClientRect();
      if (r?.width && r.height)
        this.scale.set(Math.min(r.width / PHONE_REGION.w, r.height / PHONE_REGION.h));
    });
    ro.observe(el);
    inject(DestroyRef).onDestroy(() => ro.disconnect());
  }
  protected hit(r: string): string {
    return Math.max(+r, PHONE_REGION.hit / 2 / Math.min(1, this.scale())).toFixed(2);
  }
  protected choose(i: number): void {
    if (this.pick()) this.picked.emit(i);
  }
}
