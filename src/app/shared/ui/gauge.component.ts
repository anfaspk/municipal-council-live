import {
  afterRenderEffect,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { FRAME_SCOPE, FrameHandle, FrameLoop } from '../motion/frame-loop.service';
import { reducedMotion } from '../motion/reduced-motion';
import { tween } from '../motion/tween';
import { easeExpo } from '../motion/easing';
import { pct, pctNum } from '../../domain/format';

const SVGNS = 'http://www.w3.org/2000/svg';
const f2 = (n: number) => n.toFixed(2),
  f1 = (n: number) => n.toFixed(1);

@Component({
  selector: '.gwrap',
  host: { class: 'mj-gauge', '[style.height.px]': 'size()', '[style.width.px]': 'size()' },
  templateUrl: './gauge.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GaugeComponent implements AfterViewInit {
  readonly size = input(260);
  readonly label = input('');
  readonly sub = input('');
  readonly value = input.required<number>();
  readonly introMs = input(1600);
  readonly changeMs = input(1600);
  readonly gid = input('g2');
  get id() {
    return this.gid();
  }

  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  private val!: SVGPathElement;
  private glow!: SVGPathElement;
  private num!: HTMLElement;
  private sparks!: SVGGElement;
  private cur = 0;
  private tw: FrameHandle | null = null;
  private sparkHold: FrameHandle | null = null;
  private drawn = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.tw?.stop();
      this.sparkHold?.stop();
    });
    afterRenderEffect(() => {
      const p = this.value();
      untracked(() => {
        this.set(p, this.drawn ? this.changeMs() : this.introMs());
        this.drawn = true;
      });
    });
  }

  get s() {
    return this.size();
  }
  get cx() {
    return this.s / 2;
  }
  get r() {
    return this.s * 0.4;
  }
  get sw() {
    return Math.max(8, this.s * 0.054);
  }
  get k() {
    return this.s / 260;
  }
  private pt(a: number, rr: number): [number, number] {
    const t = (a * Math.PI) / 180;
    return [this.cx + rr * Math.cos(t), this.cx + rr * Math.sin(t)];
  }
  get start() {
    return this.pt(135, this.r);
  }
  get end() {
    return this.pt(405, this.r);
  }
  get arc() {
    const s = this.start,
      e = this.end;
    return (
      'M' +
      f2(s[0]) +
      ' ' +
      f2(s[1]) +
      ' A' +
      this.r +
      ' ' +
      this.r +
      ' 0 1 1 ' +
      f2(e[0]) +
      ' ' +
      f2(e[1])
    );
  }
  get ticks() {
    return Array.from({ length: 11 }, (_, i) => {
      const a = 135 + 27 * i,
        p1 = this.pt(a, this.r + this.sw * 0.9),
        p2 = this.pt(a, this.r + this.sw * 0.9 + (i % 5 ? 4 : 8));
      return { x1: f1(p1[0]), y1: f1(p1[1]), x2: f1(p2[0]), y2: f1(p2[1]) };
    });
  }
  get milestones() {
    return [60, 65].map((m) => {
      const p = this.pt(135 + 2.7 * m, this.r - this.sw * 1.25);
      return { cx: f1(p[0]), cy: f1(p[1]) };
    });
  }
  get tip() {
    const e = this.end,
      k = this.k;
    return (
      'M' +
      f1(e[0]) +
      ' ' +
      f1(e[1]) +
      ' c' +
      -6 * k +
      ' ' +
      7 * k +
      ' ' +
      -5 * k +
      ' ' +
      19 * k +
      ' ' +
      6 * k +
      ' ' +
      22 * k +
      ' c' +
      5 * k +
      ' ' +
      1.4 * k +
      ' ' +
      9 * k +
      ' ' +
      -1 * k +
      ' ' +
      11 * k +
      ' ' +
      -5 * k
    );
  }
  get hilt() {
    const s = this.start;
    return { cx: f1(s[0]), cy: f1(s[1]), r: this.sw * 0.75 };
  }

  ngAfterViewInit(): void {
    const q = <T extends Element>(s: string) => this.el.querySelector<T>(s)!;
    this.val = q('.val');
    this.glow = q('.glow');
    this.num = q('.n');
    this.sparks = q('.sparks');
    if (!reducedMotion()) this.startSparks();
  }

  private set(p: number, dur: number): void {
    const from = this.cur;
    this.cur = p;
    this.tw?.stop();
    this.tw = tween(
      this.frames,
      dur,
      (t) => this.draw(from + (p - from) * t),
      null,
      easeExpo,
      this.scope,
    );
    this.el.setAttribute('aria-label', pct(p));
    this.el.style.setProperty('--gp', p.toFixed(2));
  }

  private draw(p: number): void {
    const d = p.toFixed(2) + ' 100';
    this.val.setAttribute('stroke-dasharray', d);
    this.glow.setAttribute('stroke-dasharray', d);
    this.num.textContent = pctNum(p);
  }
  private startSparks(): void {
    const mk = (attrs: Record<string, string>) => {
      const c = document.createElementNS(SVGNS, 'circle');
      Object.entries(attrs).forEach(([k, v]) => c.setAttribute(k, v));
      this.sparks.appendChild(c);
      return c;
    };
    [0, 1, 2].forEach((i) =>
      mk({
        r: String(2.4 - i * 0.5),
        class: 'sg',
        style: '--i:' + i + ';--o:.9',
        filter: 'url(#' + this.id + 'f)',
      }),
    );
    [0, 1, 2].forEach((i) =>
      mk({ r: String(1.4 - i * 0.3), class: 'sw', style: '--i:' + i + ';--o:1' }),
    );
    this.sparks.style.setProperty('--arc', 'path("' + this.arc + '")');
    this.sparks.classList.toggle('held', this.frames.isPaused(this.scope));
    this.sparkHold = this.frames.add(
      {
        paused: () => this.sparks.classList.add('held'),
        resumed: () => this.sparks.classList.remove('held'),
      },
      this.scope,
    );
  }
}
