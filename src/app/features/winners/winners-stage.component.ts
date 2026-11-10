import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { WinnersLoad } from '../../data/winners.store';
import { WWil } from '../../domain/winners/winners';
import { CountUpGroup } from '../../shared/motion/count-up.directive';
import { PointerTracker } from '../../shared/motion/pointer-tracker.service';
import { reducedMotion } from '../../shared/motion/reduced-motion';
import { IconComponent } from '../../shared/ui/icon.component';
import { WinnerCardComponent } from './winner-card.component';
import { SCENE_IMG, WinnersSceneComponent } from './winners-scene.component';
import { wt } from './winners-strings';
import { layoutOf, placeholders, starfield, titled, titleParts } from './winners.model';
import { WnTPipe } from './wn-t.pipe';

const COUNT_AT = 1150;
const LEAVE = 640;
const MOTES = [starfield(28, 61, 2.2, 920, 520, 0.7), starfield(18, 67, 3, 920, 520, 0.6)];

@Component({
  selector: 'div.wn-stage[wnStage]',
  imports: [IconComponent, WinnerCardComponent, WinnersSceneComponent, WnTPipe],
  providers: [CountUpGroup],
  host: { '[class.lit]': 'lit()' },
  templateUrl: './winners-stage.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersStageComponent {
  readonly wil = input<WWil | null>(null);
  readonly gov = input('');
  readonly load = input<WinnersLoad>('loading');
  readonly empty = input(false);
  readonly retry = output<void>();

  private readonly group = inject(CountUpGroup);
  protected readonly img = SCENE_IMG;
  protected readonly ready = signal(false);
  protected readonly lit = computed(() => !!this.wil()?.published);
  protected readonly gone = signal<WWil | null>(null);
  protected readonly shown = computed(() => {
    const w = this.wil(),
      g = this.gone();
    return [...(g && (!w || this.key(g) !== this.key(w)) ? [g] : []), ...(w ? [w] : [])];
  });
  protected readonly govTitle = computed(() => titled(this.gov(), wt('wnGovWord')));
  protected readonly key = (w: WWil): string => w.id + (w.published ? ':d' : ':p');
  protected readonly title = (w: WWil) => titleParts(w.name, wt('wnWilayat'));
  protected readonly layout = (w: WWil) =>
    layoutOf(w.published ? w.winners.length : (w.seats ?? 1));
  protected readonly seatsOf = placeholders;
  protected readonly skeleton = [0, 1];
  protected readonly motes = MOTES;

  private timer?: ReturnType<typeof setTimeout>;
  private leaveTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    let last: WWil | null = null;
    effect(() => {
      const w = this.wil();
      untracked(() => {
        const old = last;
        last = w;
        if (!old || (w && this.key(old) === this.key(w)) || reducedMotion()) return;
        clearTimeout(this.leaveTimer);
        this.gone.set(old);
        this.leaveTimer = setTimeout(() => this.gone.set(null), LEAVE);
      });
    });
    const k = computed(() => {
      const w = this.wil();
      return w?.published ? this.key(w) : '';
    });
    effect(() => {
      const now = k();
      untracked(() => {
        clearTimeout(this.timer);
        if (!now || reducedMotion()) return;
        this.timer = setTimeout(() => this.group.play('wn'), COUNT_AT);
      });
    });
    this.parallax();
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.timer);
      clearTimeout(this.leaveTimer);
    });
  }

  private parallax(): void {
    const host: HTMLElement = inject(ElementRef).nativeElement,
      tracker = inject(PointerTracker);
    let at: [number, number] | null = null;
    const tracking = tracker.track(host, {
      read: ({ move, last }) => {
        if (reducedMotion()) return;
        if (last.type === 'pointerleave') at = [0, 0];
        else if (move) {
          const r = tracker.rect(host);
          at = [
            Math.max(-1, Math.min(1, ((move.clientX - r.left) / r.width) * 2 - 1)),
            Math.max(-1, Math.min(1, ((move.clientY - r.top) / r.height) * 2 - 1)),
          ];
        }
      },
      write: () => {
        if (!at) return;
        host.style.setProperty('--px', at[0].toFixed(3));
        host.style.setProperty('--py', at[1].toFixed(3));
        at = null;
      },
    });
    inject(DestroyRef).onDestroy(() => tracking.stop());
  }
}
