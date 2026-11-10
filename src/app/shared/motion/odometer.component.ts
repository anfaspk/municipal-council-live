import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { FRAME_SCOPE, FrameHandle, FrameLoop } from './frame-loop.service';
import { reducedMotion } from './reduced-motion';
import { fmt } from '../../domain/format';

type Cell = { digit: true; n: number } | { digit: false; ch: string };
const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

@Component({
  selector: '.mj-odo[odoValue]',
  host: { '[attr.aria-label]': 'text()' },
  template: `@for (shape of [shape()]; track shape.key) {
    @for (c of shape.cells; track $index) {
      @if (c.digit) {
        <span class="d"
          ><span class="s" [style.transform]="offsets()[c.n]">
            @for (i of strip; track i) {
              <span>{{ i }}</span>
            }
          </span></span
        >
      } @else {
        <span class="c">{{ c.ch }}</span>
      }
    }
  }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OdometerComponent {
  readonly value = input.required<number>({ alias: 'odoValue' });
  readonly odoInstant = input(false);
  protected readonly strip = STRIP;
  protected readonly text = signal<string | null>(null);
  protected readonly shape = computed(
    () => {
      const s = this.text() ?? '';
      let n = 0;
      const cells = s
        .split('')
        .map((ch): Cell => (/\d/.test(ch) ? { digit: true, n: n++ } : { digit: false, ch }));
      return { key: s.replace(/\d/g, '0'), cells };
    },
    { equal: (a, b) => a.key === b.key },
  );
  private readonly rolled = signal<string | null>(null);
  protected readonly offsets = computed(() =>
    (this.rolled() ?? '')
      .replace(/\D/g, '')
      .split('')
      .map((d) => 'translateY(-' + d + 'em)'),
  );
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  private pending: FrameHandle | null = null;

  constructor() {
    const hold = this.frames.add(
      {
        paused: () => {
          this.pending?.stop();
          this.pending = null;
          this.rolled.set(this.text());
        },
      },
      this.scope,
    );
    inject(DestroyRef).onDestroy(() => {
      hold.stop();
      this.pending?.stop();
    });
    effect(() => {
      const s = fmt(this.value());
      untracked(() => {
        const first = this.text() === null;
        this.text.set(s);
        if (first && !reducedMotion() && !this.odoInstant() && !this.frames.isPaused(this.scope))
          this.pending = this.frames.once(
            {
              write: () => {
                this.pending = this.frames.once(
                  {
                    write: () => {
                      this.rolled.set(this.text());
                      this.pending = null;
                    },
                  },
                  this.scope,
                );
              },
            },
            this.scope,
          );
        else this.rolled.set(s);
      });
    });
  }
}
