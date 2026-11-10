import { Injectable, signal } from '@angular/core';
import { reducedMotion } from '../motion/reduced-motion';

export interface ToastOpts {
  icon?: string;
  title: string;
  sub?: string;
  ms?: number;
}
export interface Toast extends ToastOpts {
  id: number;
  out?: boolean;
}
export interface ConfettiPiece {
  size: number;
  x: number;
  y: number;
  fill: string;
  flight: Keyframe[];
  ms: number;
}
export interface ConfettiBurst {
  id: number;
  pieces: ConfettiPiece[];
}

@Injectable({ providedIn: 'root' })
export class FxService {
  readonly shown = signal(false);
  readonly toasts = signal<Toast[]>([]);
  readonly bursts = signal<ConfettiBurst[]>([]);
  private id = 0;

  toast(o: ToastOpts): void {
    const t: Toast = { ...o, id: ++this.id };
    this.shown.set(true);
    this.toasts.update((a) => [...a, t]);
    setTimeout(() => {
      this.toasts.update((a) => a.map((x) => (x.id === t.id ? { ...x, out: true } : x)));
      setTimeout(() => this.toasts.update((a) => a.filter((x) => x.id !== t.id)), 520);
    }, o.ms || 4200);
  }

  confetti(host: HTMLElement, o: { x?: number; y?: number; count?: number } = {}): void {
    if (reducedMotion()) return;
    const n = o.count || 36,
      ox = o.x ?? host.offsetWidth / 2,
      oy = o.y ?? host.offsetHeight * 0.3;
    const pieces = Array.from({ length: n }, (_, i): ConfettiPiece => {
      const size = 8 + Math.random() * 12;
      const ang = Math.random() * Math.PI * 2,
        sp = 120 + Math.random() * 320;
      const dx = Math.cos(ang) * sp,
        dy = Math.sin(ang) * sp * 0.6 - 120;
      return {
        size,
        x: ox,
        y: oy,
        fill: i % 3 ? 'var(--gold)' : 'var(--gold-glow)',
        flight: [
          { transform: 'translate(-50%,-50%) scale(.2) rotate(0deg)', opacity: 0 },
          {
            transform:
              'translate(calc(-50% + ' +
              dx * 0.6 +
              'px),calc(-50% + ' +
              dy * 0.6 +
              'px)) scale(1) rotate(160deg)',
            opacity: 1,
            offset: 0.3,
          },
          {
            transform:
              'translate(calc(-50% + ' +
              dx +
              'px),calc(-50% + ' +
              (dy + 260) +
              'px)) scale(.8) rotate(420deg)',
            opacity: 0,
          },
        ],
        ms: 2000 + Math.random() * 900,
      };
    });
    const burst: ConfettiBurst = { id: ++this.id, pieces };
    this.bursts.update((a) => [...a, burst]);
    setTimeout(() => this.bursts.update((a) => a.filter((x) => x !== burst)), 3200);
  }
}
