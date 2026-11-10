import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injectable,
  input,
  untracked,
} from '@angular/core';
import { FRAME_SCOPE, FrameHandle, FrameLoop } from './frame-loop.service';
import { countUp } from './tween';
import { fmt, pct, pctNum } from '../../domain/format';

export type CountFormat = 'int' | 'pct' | 'pctNum';
const FORMAT: Record<CountFormat, (v: number) => string> = {
  int: fmt,
  pct: (v) => pct(v),
  pctNum: (v) => pctNum(v),
};

@Injectable()
export class CountUpGroup {
  private readonly members = new Set<CountUpDirective>();
  live = false;

  add(d: CountUpDirective): void {
    this.members.add(d);
  }
  remove(d: CountUpDirective): void {
    this.members.delete(d);
  }
  play(group: string): void {
    this.members.forEach((d) => {
      if (d.countGroup() === group) d.play();
    });
  }
}

@Directive({ selector: '[mjCountUp]' })
export class CountUpDirective {
  readonly value = input.required<number>({ alias: 'mjCountUp' });
  readonly countFormat = input<CountFormat>('int');
  readonly countDuration = input(1600);
  readonly countGroup = input('');
  protected readonly text = computed(() => FORMAT[this.countFormat()](this.value()));

  private readonly el: Element = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  private tween: FrameHandle | null = null;
  private last: number | null = null;

  constructor() {
    const members = inject(CountUpGroup, { optional: true });
    members?.add(this);
    effect(() => {
      const v = this.value(),
        text = this.text();
      untracked(() => {
        const from = this.last;
        this.last = v;
        this.tween?.stop();
        this.tween = null;
        if (members?.live && from !== null && from !== v) {
          const format = FORMAT[this.countFormat()];
          this.tween = countUp(this.frames, this.el, v, {
            scope: this.scope,
            from,
            dur: this.countDuration(),
            format,
          });
        } else this.el.textContent = text;
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.tween?.stop();
      members?.remove(this);
    });
  }

  play(): void {
    this.tween?.stop();
    const format = FORMAT[this.countFormat()];
    this.tween = countUp(this.frames, this.el, this.value(), {
      dur: this.countDuration(),
      format,
      scope: this.scope,
    });
  }
}
