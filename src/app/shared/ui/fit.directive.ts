import { DestroyRef, Directive, DOCUMENT, ElementRef, inject } from '@angular/core';
import { fitOf, zoomOf } from './fit.model';

@Directive({ selector: '[mjFit]' })
export class FitDirective {
  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  private readonly html = inject(DOCUMENT).documentElement;
  private fluidOk = false;
  private readonly fit = () => {
    const vw = window.innerWidth,
      vh = window.innerHeight,
      f = fitOf(vw, vh, this.fluidOk ? zoomOf(window.outerWidth, vw) : 1, this.fluidOk),
      st = this.root.style,
      fluid = f.kind === 'fluid';
    this.root.classList.toggle('mj-fluid', fluid);
    this.html.classList.toggle('mj-fluid', fluid);
    this.html.classList.toggle('mj-zoomed', !fluid && f.scroll);
    if (fluid) {
      for (const p of [
        'position',
        'left',
        'right',
        'top',
        'margin',
        'width',
        'height',
        'transform-origin',
        'transform',
      ])
        st.removeProperty(p);
      return;
    }
    st.position = f.scroll ? 'absolute' : 'fixed';
    st.left = f.scroll ? 'auto' : '0';
    st.right = f.scroll ? '0' : 'auto';
    st.top = '0';
    st.margin = '0';
    st.width = f.width.toFixed(1) + 'px';
    st.height = f.height.toFixed(1) + 'px';
    st.transformOrigin = f.scroll ? '100% 0' : '0 0';
    st.transform = 'scale(' + f.scale.toFixed(5) + ')';
  };

  constructor() {
    this.html.classList.add('mj-fit');
    this.fit();
    window.addEventListener('resize', this.fit);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('resize', this.fit);
      this.html.classList.remove('mj-fit', 'mj-fluid', 'mj-zoomed');
    });
  }

  setFluid(ok: boolean): void {
    if (ok === this.fluidOk) return;
    this.fluidOk = ok;
    this.fit();
  }
}
