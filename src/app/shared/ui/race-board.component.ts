import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CountUpDirective, CountUpGroup } from '../motion/count-up.directive';
import { FRAME_SCOPE, FrameLoop } from '../motion/frame-loop.service';
import { reducedMotion } from '../motion/reduced-motion';
import { restartAnimation } from '../motion/restart-animation';
import { FmtPipe, PctPipe, SharePipe } from './format.pipes';
import { IconComponent } from './icon.component';
import { RaceAvatarComponent } from './race-avatar.component';
import { RaceView, restGrid } from './race-board.model';
import { TvTPipe as TPipe } from './tv-t.pipe';

interface Place {
  x: number;
  y: number;
  v: string;
  seat: boolean;
  card: boolean;
}

function placeOf(n: HTMLElement, board: HTMLElement): { x: number; y: number } {
  let x = 0,
    y = 0,
    e: HTMLElement | null = n;
  while (e && e !== board) {
    x += e.offsetLeft;
    y += e.offsetTop;
    e = e.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

@Component({
  selector: 'div[mjRaceBoard]',
  imports: [
    CountUpDirective,
    FmtPipe,
    PctPipe,
    SharePipe,
    TPipe,
    IconComponent,
    RaceAvatarComponent,
  ],
  providers: [CountUpGroup],
  host: { class: 'rs-race', '[class.rs-dense]': 'grid().dense' },
  templateUrl: './race-board.component.html',
  styleUrls: ['./race-board.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceBoardComponent {
  readonly race = input.required<RaceView>({ alias: 'mjRaceBoard' });

  readonly nextInGrid = input(false);
  readonly drawWins = input<readonly string[]>([]);
  readonly extraGridRows = input(0);
  protected readonly gridCandidates = computed(() => {
    const r = this.race();
    return this.nextInGrid() && r.next ? [{ ...r.next, d: '0.22' }, ...r.rest] : r.rest;
  });
  protected readonly grid = computed(() =>
    restGrid(this.gridCandidates().length + this.extraGridRows()),
  );
  protected readonly duelNext = computed(() => {
    const r = this.race();
    return r.seatCards.length === 1 && !this.nextInGrid() ? r.next : null;
  });

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly counts = inject(CountUpGroup);
  private places = new Map<string, Place>();

  constructor() {
    afterRenderEffect(() => {
      this.race();
      this.moved();
    });
    const first = inject(FrameLoop).once(
      {
        write: () => {
          const enter = this.host.closest('.rs-enter') && !this.host.closest('.cx-pv.now');
          if (enter && !this.still()) this.counts.play('rs');
        },
      },
      inject(FRAME_SCOPE),
    );
    inject(DestroyRef).onDestroy(() => first.stop());
  }

  private still(): boolean {
    return reducedMotion() || !!this.host.closest('.tva-still');
  }

  private moved(): void {
    const now = new Map<string, Place>(),
      nodes = Array.from(this.host.querySelectorAll<HTMLElement>('[data-id]'));
    nodes.forEach((n) => {
      now.set(n.dataset['id']!, {
        ...placeOf(n, this.host),
        v: n.querySelector('.rs-val')?.textContent ?? '',
        seat: n.classList.contains('rs-seat'),
        card: n.classList.contains('rs-hero'),
      });
    });
    const before = this.places,
      still = this.still();
    this.places = now;
    this.counts.live = !still;
    if (!before.size || still) return;
    nodes.forEach((n) => {
      const id = n.dataset['id']!,
        p = before.get(id),
        q = now.get(id)!;
      if (!p) return;
      const dx = p.x - q.x,
        dy = p.y - q.y;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        n.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px)' }, { transform: 'none' }], {
          duration: 750,
          easing: 'cubic-bezier(.34,1.56,.64,1)',
        });
      if (q.seat && !p.seat) restartAnimation(n, 'rs-gain');
      const v = n.querySelector('.rs-val');
      if (v && p.v && q.v !== p.v && !q.card) restartAnimation(v, 'rs-bump');
    });
  }
}
