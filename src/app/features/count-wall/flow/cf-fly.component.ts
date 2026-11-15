import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { CountStore } from '../../../data/count.store';
import { GEO } from '../../../domain/geo/geo.data';
import type { FlatCamera, Size } from '../../../domain/geo/projection';
import { cameraTransform } from '../../../domain/geo/projection';
import { FRAME_SCOPE, FrameHandle, FrameLoop } from '../../../shared/motion/frame-loop.service';
import { camMatrix, clamp, easeIO, f2, flightMs, interpZoom } from '../stage/stage-camera';
import { flyView, pinR } from './cf-fly.model';
import { cf } from './cf-strings';
import { mapGeom, Place } from './count-flow.model';

@Component({
  selector: 'div[cfFly]',
  host: { class: 'cf-card cf-fly', dir: 'ltr', '[class.still]': 'still()' },
  template: `<svg role="img" [attr.aria-label]="label()">
      <g #cam>
        @for (s of geom.shapes; track s.id) {<path class="cf-fly-shape" [class.on]="s.id === gid()" [attr.d]="s.d" />}
        @for (p of pins(); track p.id; let i = $index) {
          <g [class]="'cf-fly-n cf-st ' + p.st" [class.sel]="p.id === wid()" [style.--j]="i % 9">
            <circle class="cf-fly-pg" [attr.cx]="p.x" [attr.cy]="p.y" r="1" />
            <circle class="cf-fly-pin" [attr.cx]="p.x" [attr.cy]="p.y" r="1" [attr.data-w]="p.id" />
          </g>
        }
      </g>
    </svg>`,
  styleUrls: ['./cf-fly.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfFlyComponent {
  readonly place = input.required<Place>();
  readonly still = input(false);
  readonly fly = output<number>();

  private readonly store = inject(CountStore);
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly camEl = viewChild.required<ElementRef<SVGGElement>>('cam');
  protected readonly geom = mapGeom(GEO, [], null, 1);
  protected readonly pins = computed(() => mapGeom(GEO, this.store.govs, null, 1).pins);
  protected readonly gid = computed(() => {
    const p = this.place();
    return p.k === 'nat' ? null : p.gid;
  });
  protected readonly wid = computed(() => {
    const p = this.place();
    return p.k === 'wil' ? p.wid : null;
  });
  protected readonly label = computed(() => {
    const g = this.gid();
    return g ? cf('cfGovMapL', { g: this.store.gov(g)?.ar ?? '' }) : cf('cfMapL');
  });
  private readonly size = signal<Size>({ width: 0, height: 0 });
  private cam: FlatCamera | null = null;
  private drawnAt: Size | null = null;
  private flight: FrameHandle | null = null;

  constructor() {
    const ro =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(([e]) => {
            const r = e?.contentRect;
            if (r?.width && r.height) this.size.set({ width: r.width, height: r.height });
          })
        : null;
    afterNextRender(() => {
      const svg = this.host.querySelector('svg');
      if (svg) ro?.observe(svg);
    });
    afterRenderEffect(() => {
      const size = this.size(),
        to = flyView(GEO, this.place(), size);
      this.wid();
      untracked(() => this.flyTo(to, size));
    });
    inject(DestroyRef).onDestroy(() => {
      ro?.disconnect();
      this.flight?.stop();
    });
  }

  private flyTo(to: FlatCamera, size: Size): void {
    if (!size.width) return;
    this.flight?.stop();
    this.flight = null;
    const from = this.cam,
      sized = this.drawnAt === size;
    if (!from || !sized || this.still()) return this.apply(to, size);
    const ip = interpZoom([from.cx, from.cy, from.s], [to.cx, to.cy, to.s]);
    if (ip.distance < 1e-3) return this.apply(to, size);
    const ms = flightMs(ip.distance),
      t0 = performance.now();
    this.fly.emit(ms);
    const step = (now: number): void => {
      const t = clamp((now - t0) / ms, 0, 1),
        v = ip.fn(easeIO(t));
      this.apply({ cx: v[0], cy: v[1], s: v[2] }, size);
      if (t < 1) return;
      this.flight?.stop();
      this.flight = null;
    };
    this.flight = this.frames.add({ write: step }, this.scope);
  }

  private apply(cam: FlatCamera, size: Size): void {
    this.cam = cam;
    this.drawnAt = size;
    this.camEl().nativeElement.setAttribute('transform', camMatrix(cameraTransform(cam, size)));
    const r = f2(pinR(cam, size, false)),
      lit = f2(pinR(cam, size, true)),
      w = String(this.wid());
    this.host.querySelectorAll<SVGGElement>('.cf-fly-n').forEach((n) => {
      const sel = n.lastElementChild?.getAttribute('data-w') === w;
      n.querySelectorAll('circle').forEach((c) => c.setAttribute('r', sel ? lit : r));
    });
  }
}
