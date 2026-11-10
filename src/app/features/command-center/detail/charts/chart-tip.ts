import {
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  Injectable,
  input,
  signal,
} from '@angular/core';
import { FrameHandle, FrameLoop } from '../../../../shared/motion/frame-loop.service';

@Injectable()
export class ChartTip {
  private readonly frames = inject(FrameLoop);
  private readonly page: HTMLElement = inject(ElementRef).nativeElement;
  private el: HTMLElement | null = null;
  private job: FrameHandle | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.job?.stop();
      this.el?.remove();
    });
  }

  show(anchor: Element, text: string): void {
    const tip = (this.el ??= this.make());
    let x = 0,
      y = 0,
      below = false;
    this.job?.stop();
    this.job = this.frames.once(
      {
        read: () => {
          const a = anchor.getBoundingClientRect(),
            p = this.page.getBoundingClientRect(),
            s = p.width / (this.page.offsetWidth || p.width || 1);
          x = Math.min(Math.max((p.right - (a.left + a.width / 2)) / s, 96), p.width / s - 96);
          y = (a.top - p.top) / s;
          below = y < 72;
          if (below) y = (a.bottom - p.top) / s;
        },
        write: () => {
          tip.textContent = text;
          tip.style.setProperty('--tx', x.toFixed(1));
          tip.style.setProperty('--ty', y.toFixed(1));
          tip.classList.toggle('below', below);
          tip.classList.add('on');
        },
      },
      'detail',
    );
  }
  hide(): void {
    this.job?.stop();
    this.job = null;
    this.el?.classList.remove('on');
  }

  private make(): HTMLElement {
    const el = document.createElement('div');
    el.className = 'dt-tip';
    el.setAttribute('aria-hidden', 'true');
    this.page.appendChild(el);
    return el;
  }
}

@Directive({
  selector: '[dtChart]',
  exportAs: 'dtChart',
  host: {
    role: 'img',
    tabindex: '0',
    '[attr.aria-label]': 'dtChart()',
    '(pointermove)': 'over($event)',
    '(pointerleave)': 'leave()',
    '(focus)': 'step(0)',
    '(blur)': 'leave()',
    '(keydown)': 'key($event)',
  },
})
export class ChartDirective {
  readonly dtChart = input.required<string>();
  readonly dtTips = input.required<readonly string[]>();
  readonly active = signal<number | null>(null);
  private readonly tip = inject(ChartTip);
  private readonly host: Element = inject(ElementRef).nativeElement;

  protected over(e: PointerEvent): void {
    const t = (e.target as Element | null)?.closest?.('[data-i]');
    if (!t || !this.host.contains(t)) return this.leave();
    const i = Number(t.getAttribute('data-i'));
    if (i !== this.active()) this.to(i, t);
  }
  protected leave(): void {
    this.active.set(null);
    this.tip.hide();
  }
  protected key(e: KeyboardEvent): void {
    const n = this.dtTips().length,
      i = this.active();
    if (!n) return;
    const to =
      e.key === 'ArrowDown'
        ? Math.min(n - 1, (i ?? -1) + 1)
        : e.key === 'ArrowUp'
          ? Math.max(0, (i ?? n) - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    this.to(to);
  }
  protected step(i: number): void {
    if (this.dtTips().length) this.to(this.active() ?? i);
  }
  private to(i: number, el?: Element): void {
    this.active.set(i);
    const a = el ?? this.host.querySelector(`[data-i="${i}"]`),
      s = this.dtTips()[i];
    if (a && s) this.tip.show(a, s);
    else this.tip.hide();
  }
}
