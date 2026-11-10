import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../../data/turnout.store';
import { FRAME_SCOPE, FrameLoop } from '../../../../shared/motion/frame-loop.service';
import { reducedMotion } from '../../../../shared/motion/reduced-motion';
import { restartAnimation } from '../../../../shared/motion/restart-animation';
import { LOGO_DARK } from '../../../../shared/ui/brand';
import { uid } from '../../../../shared/ui/uid';
import { bt } from './ballot-strings';
import {
  BALLOT_STILL,
  ballotArt,
  ballotAt,
  type BallotFrame,
  frameKey,
  LOOP,
  OK,
  STEPS,
} from './ballot.model';

@Component({
  selector: 'div[mvBallot]',
  templateUrl: './ballot.component.html',
  styleUrls: ['./ballot.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mj-ballot mv',
    'aria-hidden': 'true',
    '[style.--mv-level]': 'level()',
    '[style.--mv-ld]': 'sweep()',
  },
})
export class BallotComponent {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly stats = inject(TurnoutStore);
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  protected readonly art = ballotArt();
  protected readonly steps = STEPS;
  protected readonly gid = uid('mvg');
  protected readonly logo = LOGO_DARK;
  protected readonly s = {
    election: bt('election'),
    start: bt('mvStart'),
    step: STEPS.map((_, i) => bt('mvStep', { n: i + 1, t: STEPS.length })),
    civil: bt('mvCivil'),
    tap: bt('mvTap'),
    civilOk: bt('mvCivilOk'),
    face: bt('mvFace'),
    verify: bt('mvVerify'),
    faceOk: bt('mvFaceOk'),
    pass: bt('mvPass'),
    passSub: bt('mvPassSub'),
    app: bt('mvApp'),
    swipe: bt('mvSwipe'),
    dc: bt('mvDc'),
    sending: bt('mvSending'),
    recorded: bt('mvRecorded'),
    secure: bt('mvSecure'),
  };
  private readonly shown = signal(reducedMotion());
  protected readonly level = computed(() =>
    this.shown() ? Math.max(0, Math.min(1, this.stats.turnout() / 100)).toFixed(4) : '0',
  );
  protected readonly sweep = signal(reducedMotion() ? '0ms' : '1800ms');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const scr = this.host.querySelector<HTMLElement>('.mv-scr')!;
      const parts = {
        scr,
        views: STEPS.map((k) => scr.querySelector<HTMLElement>('.mv-' + k)!),
        segs: Array.from(scr.querySelectorAll<HTMLElement>('.mv-steps i')),
        beam: this.host.querySelector<HTMLElement>('.mv-beam')!,
      };
      if (reducedMotion()) {
        paint(this.host, parts, BALLOT_STILL);
        return;
      }
      let key = '',
        at = 0,
        last: number | null = null,
        first = true;
      const handle = this.frames.add(
        {
          write: (now) => {
            at += last === null ? 0 : Math.min(now - last, 100);
            last = now;
            if (at >= LOOP) {
              at %= LOOP;
              first = false;
            }
            if (!this.shown()) this.shown.set(true);
            else if (this.sweep() !== '1200ms' && at > 2000) this.sweep.set('1200ms');
            const f = ballotAt(at, first),
              k = frameKey(f);
            if (k !== key) paint(this.host, parts, f);
            key = k;
          },
          paused: () => (last = null),
        },
        this.scope,
      );
      destroyRef.onDestroy(() => handle.stop());
    });
    let seen: number | null = null;
    effect(() => {
      const voted = this.stats.national().voted;
      untracked(() => {
        if (
          seen !== null &&
          voted !== seen &&
          !reducedMotion() &&
          !this.frames.isPaused(this.scope)
        )
          restartAnimation(this.host, 'hit');
        seen = voted;
      });
    });
  }
}

interface Parts {
  scr: HTMLElement;
  views: HTMLElement[];
  segs: HTMLElement[];
  beam: HTMLElement;
}

function paint(host: HTMLElement, p: Parts, f: BallotFrame): void {
  p.scr.dataset['s'] = f.screen;
  if (f.screen !== 'home') p.scr.style.setProperty('--seg', OK[f.screen] + 'ms');
  p.scr.classList.toggle('tapped', f.tapped);
  p.views.forEach((v, i) => {
    v.classList.toggle('run', f.run[i]!);
    v.classList.toggle('ok', f.ok[i]!);
  });
  p.segs.forEach((g, i) => (g.className = f.seg[i]!));
  p.beam.classList.toggle('on', f.beam);
  host.classList.toggle('fly', f.fly);
}
