import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { RegionColumns } from '../tv-geometry';
import { TvSlideState } from './tv-slide-state';
import { BANDS } from '../../../domain/stats/turnout';

const SHORTEST = Math.cos((16 * Math.PI) / 180) * 0.92;

@Component({
  selector: 'svg[appTvRegionColumns]',
  imports: [CountUpDirective],
  host: {
    '[attr.viewBox]': 'columns().viewBox',
    preserveAspectRatio: 'xMidYMid meet',
    'aria-hidden': 'true',
  },
  templateUrl: './tv-region-columns.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvRegionColumnsComponent {
  readonly columns = input.required<RegionColumns>();
  protected readonly spot = inject(TvSlideState).spot;
  protected readonly bands = BANDS;
  private readonly host = inject<ElementRef<SVGSVGElement>>(ElementRef).nativeElement;
  private size = { w: 0, h: 0 };

  constructor() {
    const ro = new ResizeObserver(([e]) => {
      const box = e!.contentBoxSize[0]!;
      this.size = { w: box.inlineSize, h: box.blockSize };
      this.units();
    });
    ro.observe(this.host);
    inject(DestroyRef).onDestroy(() => ro.disconnect());
    effect(() => this.units());
  }

  private units(): void {
    const [, , vw = 0, vh = 0] = this.columns().viewBox.split(' ').map(Number),
      { w, h } = this.size;
    if (!w || !h) return;
    this.host.style.setProperty('--tv-u', (Math.max(vw / w, vh / h) / SHORTEST).toFixed(4));
  }

  protected ref(b: string): string {
    return this.columns().id + '-' + b;
  }
  protected url(b: string): string {
    return 'url(#' + this.ref(b) + ')';
  }
  protected color(b: string): string {
    return 'var(--band-' + b + ')';
  }
}
