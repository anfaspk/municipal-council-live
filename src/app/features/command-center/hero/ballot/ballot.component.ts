import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { FRAME_SCOPE, FrameLoop } from '../../../../shared/motion/frame-loop.service';
import { ornaments } from '../../../../shared/motion/effects-tier';
import { LOGO_DARK, logoFor } from '../../../../shared/ui/brand';
import { ViewportState } from '../../../../core/screen/viewport.state';
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
  },
})
export class BallotComponent {
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly frames = inject(FrameLoop);
  private readonly scope = inject(FRAME_SCOPE);
  protected readonly art = ballotArt();
  protected readonly steps = STEPS;
  private readonly viewport = inject(ViewportState);
  protected readonly logo = computed(() => logoFor(LOGO_DARK, this.viewport.form() === 'flow'));
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

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const scr = this.host.querySelector<HTMLElement>('.mv-scr')!;
      const parts = {
        scr,
        views: STEPS.map((k) => scr.querySelector<HTMLElement>('.mv-' + k)!),
        segs: Array.from(scr.querySelectorAll<HTMLElement>('.mv-steps i')),
        beam: this.host.querySelector<HTMLElement>('.mv-beam'),
      };
      if (!ornaments()) {
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
  }
}

interface Parts {
  scr: HTMLElement;
  views: HTMLElement[];
  segs: HTMLElement[];
  beam: HTMLElement | null;
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
  p.beam?.classList.toggle('on', f.beam);
  host.classList.toggle('fly', f.fly);
}
