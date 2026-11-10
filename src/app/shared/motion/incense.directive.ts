import { AfterViewInit, DestroyRef, Directive, ElementRef, inject } from '@angular/core';
import { FrameLoop } from './frame-loop.service';
import { reducedMotion } from './reduced-motion';

@Directive({ selector: 'canvas.incense' })
export class IncenseDirective implements AfterViewInit {
  private readonly canvas: HTMLCanvasElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    if (reducedMotion()) return;
    const canvas = this.canvas,
      ctx = canvas.getContext('2d')!,
      parts: { x: number; y: number; s: number; v: number; p: number }[] = [];
    let W = 0,
      H = 0,
      col = '255,210,122',
      resized: [number, number] | null = null,
      recolour = true;
    const size = (w: number, h: number) => {
      W = canvas.width = w;
      H = canvas.height = h;
    };
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
    const read = () => {
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
      parts.forEach((q) => {
        q.y -= q.v;
        if (q.y < -0.05) {
          q.y = 1.05;
          q.x = Math.random();
        }
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
      },
      'dashboard',
    );
    const stop = () => {
      loop.stop();
      themes.disconnect();
      sizes.disconnect();
    };
    this.destroyRef.onDestroy(stop);
  }
}
