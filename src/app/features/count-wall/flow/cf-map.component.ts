import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { GEO } from '../../../domain/geo/geo.data';
import { CGov } from '../../../domain/count/count';
import { cf } from './cf-strings';
import { mapGeom } from './count-flow.model';

@Component({
  selector: 'div[cfMap]',
  host: { class: 'cf-map', dir: 'ltr', '[class.thumb]': '!!gid()' },
  template: `@let m = geom();
    <svg [attr.viewBox]="m.box" role="group" [attr.aria-label]="label()">
      @for (s of m.shapes; track s.id) {
        <path class="cf-map-shape" [class.on]="s.id === gid()" [attr.d]="s.d" [attr.data-g]="gid() ? null : s.id" [style.stroke-width]="m.k" (click)="gid() ? null : pickGov.emit(s.id)" />
      }
      @for (p of m.pins; track p.id) {
        <circle [class]="'cf-map-pin cf-st ' + p.st" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="m.r" [style.stroke-width]="m.k * 1.5" />
        @if (p.id === lit()) {<circle class="cf-map-lit" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="m.r * 2.4" [style.stroke-width]="m.k * 3" />}
      }
      @if (gid()) {
        @for (p of m.pins; track p.id) {
          <circle class="cf-map-hit" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="hit()" [attr.data-w]="p.id" (click)="pickWil.emit(p.id)" />
        }
      }
    </svg>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfMapComponent {
  readonly govs = input.required<readonly CGov[]>();
  readonly gid = input<string | null>(null);
  readonly lit = input<number | null>(null);
  readonly pickGov = output<string>();
  readonly pickWil = output<number>();
  private readonly size = signal({ w: 358, h: 0 });
  protected readonly geom = computed(() => {
    const s = this.size();
    return mapGeom(GEO, this.govs(), this.gid(), s.w, s.h);
  });
  protected readonly hit = computed(() => (22 * this.geom().perPx).toFixed(2));
  protected readonly label = computed(() => {
    const g = this.gid();
    return g ? cf('cfGovMapL', { g: this.govs().find((x) => x.id === g)?.ar ?? '' }) : cf('cfMapL');
  });

  constructor() {
    const el: HTMLElement = inject(ElementRef).nativeElement;
    const ro =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(([e]) => {
            const r = e?.contentRect;
            if (r?.width) this.size.set({ w: r.width, h: r.height });
          })
        : null;
    afterNextRender(() => {
      const svg = el.querySelector('svg');
      if (svg) ro?.observe(svg);
    });
    inject(DestroyRef).onDestroy(() => ro?.disconnect());
  }
}
