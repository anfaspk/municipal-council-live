import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { reducedMotion } from '../../../shared/motion/reduced-motion';
import { cueRing, cueSecs, cueUrgent } from './interim-cue.model';
import { InterimCue } from './interim-cue.state';
import { irT } from './interim-strings';

const EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
const POP: Keyframe[] = [
  { opacity: 0, transform: 'translateY(-40%) scale(0.8)' },
  { opacity: 1, transform: 'none' },
];
const BEAT: Keyframe[] = [{ transform: 'scale(1.35)' }, { transform: 'none' }];
const WAVE: Keyframe[] = [
  { opacity: 0.8, transform: 'scale(0.6)' },
  { opacity: 0, transform: 'scale(1.7)' },
];

@Component({
  selector: 'div[ccInterimCd]',
  templateUrl: './interim-count.component.html',
  styleUrls: ['./interim-base.scss', './interim-count.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ir ir-pod', '[class.on]': 'shown()' },
})
export class InterimCountComponent {
  private readonly cue = inject(InterimCue);
  readonly s = {
    kick: irT('irKick'),
    tag: irT('irTag'),
    sub: irT('irCueS'),
    sec: irT('irSec'),
  };

  private readonly counting = computed(() => this.cue.cue() === 'count');
  readonly shown = computed(() => this.counting() || this.cue.landing());
  readonly landing = computed(() => !this.counting() && this.cue.landing());
  private readonly left = computed(() => (this.counting() ? this.cue.left() : 0));
  readonly ring = computed(() => cueRing(this.left()));
  readonly secs = computed(() => cueSecs(this.left()));
  readonly urgent = computed(() => this.counting() && cueUrgent(this.left()));
  readonly title = computed(() => {
    const at = this.cue.fromAt();
    return at ? irT('irCueT', { t: at }) : irT('irCueTNow');
  });
  readonly timerL = computed(() => irT('irCueL', { n: this.secs() }));
  private readonly num = viewChild<ElementRef<HTMLElement>>('num');
  private readonly wave = viewChild<ElementRef<HTMLElement>>('wave');

  constructor() {
    afterRenderEffect(() => {
      this.secs();
      const hot = this.urgent(),
        b = this.num()?.nativeElement;
      if (!b || reducedMotion()) return;
      b.animate(hot ? BEAT : POP, { duration: 450, easing: EXPO });
      if (hot) this.wave()?.nativeElement.animate(WAVE, { duration: 900, easing: 'ease-out' });
    });
  }

  landed(e: AnimationEvent): void {
    if (e.animationName === 'ir-land') this.cue.landing.set(false);
  }
}
