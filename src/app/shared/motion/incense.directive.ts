import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { FrameLoop } from './frame-loop.service';
import { ornaments } from './effects-tier';
import { backingScale, type Mote, rise, stepOf } from './incense.model';

@Directive({ selector: 'canvas.incense' })
export class IncenseDirective implements AfterViewInit {
  private readonly canvas: HTMLCanvasElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    if (!ornaments()) return;
    const canvas = this.canvas,
      ctx = canvas.getContext('2d')!,
      parts: Mote[] = [];
    let W = 0,
      H = 0,
      k = 1,
      last: number | null = null,
      col = '255,210,122',
      resized: [number, number] | null = null,
      rescale = true,
      recolour = true;
    const size = (w: number, h: number) => {
      W = w;
      H = h;
      canvas.width = Math.round(w * k);
      canvas.height = Math.round(h * k);
      ctx.setTransform(k, 0, 0, k, 0, 0);
    };
    const scale = () => {
      rescale = false;
      const w = canvas.offsetWidth;
      k = backingScale(
        window.devicePixelRatio || 1,
        w ? canvas.getBoundingClientRect().width / w : 1,
      );
    };
    scale();
    size(canvas.offsetWidth, canvas.offsetHeight);
    for (let i = 0; i < 70; i++)
      parts.push({
        x: Math.random(),
        y: Math.random(),
        s: Math.random() * 1.6 + 0.4,
        v: Math.random() * 0.0009 + 0.0004,
        p: Math.random() * 6.28,
      });
    const themed = canvas.closest('[data-theme]');
    const themes = new MutationObserver(() => {
      recolour = true;
    });
    if (themed) themes.observe(themed, { attributes: true, attributeFilter: ['data-theme'] });
    const sizes = new ResizeObserver(([e]) => {
      const box = e!.borderBoxSize[0]!,
        w = Math.round(box.inlineSize);
      if (w !== W) resized = [w, Math.round(box.blockSize)];
    });
    sizes.observe(canvas);
    const restale = () => {
      rescale = true;
    };
    window.addEventListener('resize', restale, { passive: true });
    const read = () => {
      if (rescale) {
        const was = k;
        scale();
        if (k !== was) resized ??= [W, H];
      }
      if (!recolour) return;
      recolour = false;
      const c = getComputedStyle(canvas).getPropertyValue('--gold-glow').trim();
      if (/^#([0-9a-f]{6})$/i.test(c))
        col =
          parseInt(c.slice(1, 3), 16) +
          ',' +
          parseInt(c.slice(3, 5), 16) +
          ',' +
          parseInt(c.slice(5, 7), 16);
    };
    const draw = (now: number) => {
      if (resized) size(resized[0], resized[1]);
      resized = null;
      ctx.clearRect(0, 0, W, H);
      rise(parts, stepOf(last, now), Math.random);
      last = now;
      parts.forEach((q) => {
        const x = (q.x + Math.sin(now / 1800 + q.p + q.y * 6) * 0.03) * W,
          y = q.y * H,
          a = Math.sin(q.y * Math.PI) * 0.45;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(' + col + ',' + a.toFixed(3) + ')';
        ctx.arc(x, y, q.s, 0, 6.283);
        ctx.fill();
      });
    };
    read();
    draw(performance.now());
    const loop = this.frames.add(
      {
        read,
        write: (now) => {
          if (canvas.isConnected) draw(now);
          else stop();
        },
        paused: () => (last = null),
      },
      'dashboard',
    );
    const stop = () => {
      loop.stop();
      themes.disconnect();
      sizes.disconnect();
      window.removeEventListener('resize', restale);
    };
    this.destroyRef.onDestroy(stop);
  }
}
