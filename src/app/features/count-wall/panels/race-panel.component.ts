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
import { ScreenState } from '../../../core/screen/screen.state';
import { ConflictStore } from '../../../data/conflict.store';
import { CountStore } from '../../../data/count.store';
import { CDraw, drawFromCount, tieKind, tieReopened } from '../../../domain/conflict/conflict';
import { CWil } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { fmt, sharePct } from '../../../domain/format';
import { IconComponent } from '../../../shared/ui/icon.component';
import { RaceBoardComponent } from '../../../shared/ui/race-board.component';
import { raceView } from '../../../shared/ui/race-board.model';
import { DrawFocus } from '../draw/draw-focus';
import { CountStatus } from './panel-parts';

const ENTER_MS = 1600;
const TIE_TEXT = { f1: 'cxTieF1', f2: 'cxTieF2', s: 'cxTieS2' } as const;
const NONE: readonly string[] = [];

@Component({
  selector: 'div[countRacePanel]',
  templateUrl: './race-panel.component.html',
  imports: [CountStatus, IconComponent, RaceBoardComponent],
  host: { '[class.rs-enter]': 'entering()' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RacePanel {
  readonly wilayat = input.required<CWil>();
  private readonly store = inject(CountStore);
  private readonly conflicts = inject(ConflictStore);
  private readonly screen = inject(ScreenState);
  private readonly drawFocus = inject(DrawFocus);
  private readonly live = signal<CWil | null>(null);
  protected readonly wil = computed(() => this.live() ?? this.wilayat());
  protected readonly race = computed(() => raceView(this.wil(), this.store.history));
  protected readonly top = computed(() => Math.max(1, ...this.wil().cands.map((c) => c.v)));
  protected readonly entering = signal(true);
  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly share = sharePct;
  protected readonly min = Math.min;
  protected readonly tie = computed(() => {
    const w = this.wil();
    if (!w.conflict) return null;
    return ct(w.conflict.text ? TIE_TEXT[tieKind(w.conflict.text, w.seats)] : 'cxTie');
  });
  protected readonly draw = computed((): CDraw | null => {
    const w = this.wil();
    return w.drawn ? (this.conflicts.draws().get(w.id) ?? drawFromCount(w)) : null;
  });
  protected readonly drawWins = computed(() => this.draw()?.wins.map((x) => x.id) ?? NONE);

  constructor() {
    const timer = setTimeout(() => this.entering.set(false), ENTER_MS);
    inject(DestroyRef).onDestroy(() => clearTimeout(timer));
    effect(() => {
      const w = this.wil();
      untracked(() => {
        if (w.drawn) this.conflicts.want(w.id);
        else if (tieReopened(w)) this.conflicts.forget(w.id);
      });
    });
  }

  protected play(): void {
    if (!this.draw() && !this.tie()) return;
    this.drawFocus.open(this.wil());
    this.screen.show('draw');
  }

  update(w: CWil): void {
    this.live.set(w);
  }
}
