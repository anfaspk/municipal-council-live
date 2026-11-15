import { DestroyRef, Directive, DOCUMENT, effect, ElementRef, inject } from '@angular/core';
import { ViewportState } from '../../core/screen/viewport.state';
import { setLiteFx } from '../../shared/motion/effects-tier';

@Directive({ selector: '[mjFit]' })
export class FitDirective {
  private readonly root: HTMLElement = inject(ElementRef).nativeElement;
  private readonly html = inject(DOCUMENT).documentElement;
  private readonly viewport = inject(ViewportState);

  constructor() {
    this.html.classList.add('mj-fit');
    effect(() => {
      const l = this.viewport.layout(),
        safe = this.viewport.safe(),
        st = this.root.style,
        flow = l.form === 'flow';
      for (const el of [this.root, this.html]) {
        if (el.dataset['form'] !== l.form) el.dataset['form'] = l.form;
        if (el.dataset['tier'] !== l.tier) el.dataset['tier'] = l.tier;
        el.toggleAttribute('data-short', l.short);
      }
      this.html.classList.toggle('mj-zoomed', l.scroll);
      const fx = this.viewport.fx();
      if (this.html.dataset['fx'] !== fx) this.html.dataset['fx'] = fx;
      setLiteFx(fx === 'lite');
      st.setProperty('--fit-scale', String(l.scale));
      if (flow) {
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
      const x = safe.left + Math.max(0, (safe.width - l.frameW * l.scale) / 2);
      st.position = l.scroll ? 'absolute' : 'fixed';
      st.left = l.scroll ? 'auto' : x > 0.05 ? x.toFixed(1) + 'px' : '0';
      st.right = l.scroll ? '0' : 'auto';
      st.top = l.scroll || safe.top < 0.05 ? '0' : safe.top.toFixed(1) + 'px';
      st.margin = '0';
      st.width = l.frameW.toFixed(1) + 'px';
      st.height = (l.frameH ?? 0).toFixed(1) + 'px';
      st.transformOrigin = l.scroll ? '100% 0' : '0 0';
      st.transform = 'scale(' + l.scale.toFixed(5) + ')';
    });
    inject(DestroyRef).onDestroy(() => {
      this.html.classList.remove('mj-fit', 'mj-zoomed');
      for (const a of ['data-form', 'data-tier', 'data-short', 'data-fx'])
        this.html.removeAttribute(a);
      setLiteFx(false);
    });
  }
}
