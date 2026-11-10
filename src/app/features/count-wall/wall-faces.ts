import { signal } from '@angular/core';
import { CGov, CNat, CWil } from '../../domain/count/count';
import { FrameLoop } from '../../shared/motion/frame-loop.service';
import { PanelView } from './count-wall-state';
import { revealMask, revealRadius, revealStart } from './count-wall.model';
import { clamp, easeIO, f1 } from './stage/stage-camera';

export interface Face extends HTMLElement {
  _rv?: object | null;
  _lt?: ReturnType<typeof setTimeout>;
}
export type Origin = [number, number];
export interface FacesHost {
  root: HTMLElement;
  frames: FrameLoop;
  instant(): boolean;
  detectChanges(): void;
  national(): CNat;
  governors(): CGov[];
  results(): boolean;
}

export class WallFaces {
  readonly panels = signal<PanelView[][]>([[], []]);
  private face = 0;
  private number = 0;
  constructor(private readonly h: FacesHost) {}

  reset(): void {
    this.face = 0;
    this.panels.set([[], []]);
  }
  view(kind: PanelView['kind'], governorate?: CGov, wilayat?: CWil): PanelView {
    return {
      key: ++this.number,
      kind,
      governorate,
      wilayat,
      results: this.h.results(),
      ...(kind === 'national'
        ? { national: this.h.national(), governors: this.h.governors() }
        : {}),
    };
  }
  render(index: number, view?: PanelView): void {
    const face = this.all()[index];
    face?.querySelectorAll('.cx-wave').forEach((wave) => wave.remove());
    this.panels.update((panels) =>
      panels.map((current, i) => (i === index ? (view ? [view] : []) : current)),
    );
    this.h.detectChanges();
  }
  all(): NodeListOf<Face> {
    return this.h.root.querySelectorAll<Face>('.cx-pv');
  }
  current(): Face | undefined {
    return this.all()[1 - this.face];
  }
  currentIndex(): number {
    return 1 - this.face;
  }
  swap(view: PanelView, origin: Origin | null, instant?: boolean): Face {
    const fs = this.all(),
      inc = fs[this.face]!,
      out = fs[1 - this.face]!;
    this.face = 1 - this.face;
    [inc, out].forEach((f) => {
      f._rv = null;
      f.style.webkitMaskImage = f.style.maskImage = '';
      if (f.getAnimations) f.getAnimations().forEach((a) => a.cancel());
    });
    const incomingIndex = 1 - this.face;
    const outgoingIndex = this.face;
    this.render(incomingIndex, view);
    inc.className = 'cx-pv on';
    out.className = 'cx-pv';
    inc.removeAttribute('aria-hidden');
    out.setAttribute('aria-hidden', 'true');
    clearTimeout(inc._lt);
    if (instant || this.h.instant() || !inc.animate) {
      this.render(outgoingIndex);
      inc.classList.add('now');
      return inc;
    }
    const W = inc.offsetWidth,
      H = inc.offsetHeight,
      ox = origin ? origin[0] + out.offsetLeft - inc.offsetLeft : W,
      oy = origin ? origin[1] : 0;
    const R = revealRadius(ox, oy, W, H);
    inc.classList.add('cx-in');
    this.reveal(inc, ox, oy, R);
    const wave = document.createElement('i');
    wave.className = 'cx-wave';
    wave.style.left = f1(ox) + 'px';
    wave.style.top = f1(oy) + 'px';
    inc.appendChild(wave);
    wave.animate(
      [
        { transform: 'translate(-50%,-50%) scale(0)', opacity: 0.9 },
        { transform: 'translate(-50%,-50%) scale(' + f1(R / 50) + ')', opacity: 0 },
      ],
      { duration: 1000, easing: 'cubic-bezier(.7,0,.2,1)' },
    ).onfinish = () => wave.remove();
    out.classList.add('leave');
    clearTimeout(out._lt);
    out._lt = setTimeout(() => {
      if (out.isConnected && !out.classList.contains('on')) {
        this.render(outgoingIndex);
        out.classList.remove('leave');
      }
    }, 560);
    return inc;
  }
  private reveal(f: Face, ox: number, oy: number, R: number): void {
    const tok = {},
      t0 = performance.now(),
      duration = 1000,
      fe = 110;
    f._rv = tok;
    const step = (now: number): boolean => {
      if (f._rv !== tok) return false;
      const t = clamp((now - t0) / duration, 0, 1),
        r = (R + fe) * easeIO(t);
      if (t >= 1) {
        f.style.webkitMaskImage = f.style.maskImage = '';
        f._rv = null;
        return false;
      }
      const g = revealMask(ox, oy, r, fe);
      f.style.webkitMaskImage = g;
      f.style.maskImage = g;
      return true;
    };
    step(t0);
    const run = this.h.frames.add(
      {
        write: (now) => {
          if (!step(now)) run.stop();
        },
      },
      'wall',
    );
    const g0 = revealStart(ox, oy);
    f.style.webkitMaskImage = g0;
    f.style.maskImage = g0;
  }
  static origin(face: HTMLElement, el?: Element): Origin {
    if (!el) return [0, face.offsetHeight * 0.3];
    const fb = face.getBoundingClientRect(),
      eb = el.getBoundingClientRect(),
      z = face.offsetWidth / (fb.width || 1);
    return [(eb.left + eb.width / 2 - fb.left) * z, (eb.top + eb.height / 2 - fb.top) * z];
  }
}
