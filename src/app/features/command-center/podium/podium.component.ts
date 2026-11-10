import {
  afterNextRender,
  afterRenderEffect,
  computed,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TurnoutStore } from '../../../data/turnout.store';
import { ScreenUpdates } from '../../screens/screen-updates';
import { BootFlag } from '../../../shared/motion/boot';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { countUp } from '../../../shared/motion/tween';
import { fmt, pct } from '../../../domain/format';
import { PodItem, PodView, podiumView } from './podium.model';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';

const HEIGHTS = [84, 66, 54];

@Component({
  selector: 'section.cc-podium',
  imports: [TPipe],
  templateUrl: './podium.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PodiumComponent {
  private readonly state = inject(CommandCenterState);
  readonly heights = HEIGHTS;
  readonly fmt = fmt;
  readonly pct = pct;
  readonly view = signal<PodView>({ key: 'nat', items: [], animate: false, lead: 1, gov: null });
  readonly hin = signal(false);
  private readonly stats = inject(TurnoutStore);
  private readonly updates = inject(ScreenUpdates);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly injector = inject(Injector);
  private first = true;
  private readonly boot = inject(BootFlag).first;
  protected readonly pods = computed((): (PodItem | undefined)[] => {
    const items = this.view().items;
    return [items[1], items[0], items[2]];
  });
  private places = new Map<string, { x: number; y: number }>();
  private subject = '';
  private settle = false;

  constructor() {
    effect(() => {
      this.state.side();
      untracked(() => {
        this.render(this.first ? this.boot : true);
        this.first = false;
      });
    });
    this.updates.podium.pipe(takeUntilDestroyed()).subscribe((e) => {
      if (e.type === 'pull' || e.type === 'resume') this.render(false, e.type === 'resume');
    });
    afterRenderEffect(() => {
      const v = this.view();
      const nodes = Array.from(this.host.querySelectorAll<HTMLElement>('[data-pod]'));
      const now = new Map(
        nodes.map((n) => [n.dataset['pod']!, { x: n.offsetLeft, y: n.offsetTop }]),
      );
      if (
        v.key === this.subject &&
        !this.settle &&
        !v.animate &&
        !reducedMotion() &&
        !this.frames.isPaused('dashboard')
      ) {
        nodes.forEach((n) => {
          const from = this.places.get(n.dataset['pod']!),
            to = now.get(n.dataset['pod']!)!;
          if (from && (from.x !== to.x || from.y !== to.y))
            n.animate(
              [
                { transform: `translate(${from.x - to.x}px,${from.y - to.y}px)` },
                { transform: 'none' },
              ],
              {
                duration: 750,
                easing: 'cubic-bezier(.34,1.56,.64,1)',
              },
            );
        });
      }
      this.places = now;
      this.subject = v.key;
      this.settle = false;
    });
  }

  render(animate: boolean, settle = false): void {
    this.settle = settle;
    const id = this.state.side(),
      g = id ? this.stats.gov(id) : null;
    const anim = animate && !reducedMotion() && !this.frames.isPaused('dashboard');
    if (anim) this.hin.set(true);
    this.view.set(podiumView(this.stats.govs(), g, anim));
    if (anim)
      afterNextRender(
        () =>
          this.host.querySelectorAll('[data-pv]').forEach((e) =>
            countUp(this.frames, e, +e.getAttribute('data-pv')!, {
              dur: 1200,
              format: (v) => pct(v),
            }),
          ),
        { injector: this.injector },
      );
  }
}
