import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { InterimStore } from '../../../data/interim.store';
import { fmt } from '../../../domain/format';
import { restartAnimation } from '../../../shared/motion/restart-animation';
import { FmtPipe, SharePipe } from '../../../shared/ui/format.pipes';
import { IconComponent } from '../../../shared/ui/icon.component';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';
import { interimGov, InterimRow } from '../tv-interim.model';
import { TvSlide } from '../tv-slide.model';
import { TvSlideState } from './tv-slide-state';

@Component({
  selector: 'div[appTvInterim]',
  imports: [FmtPipe, SharePipe, TPipe, IconComponent, RaceAvatarComponent],
  host: { class: 'tv-int' },
  templateUrl: './tv-interim.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvInterimComponent {
  readonly slide = input.required<TvSlide>();

  private readonly store = inject(InterimStore);
  private readonly spot = inject(TvSlideState).spot;
  protected readonly toAt = this.store.toAt;
  private readonly hero = viewChild<ElementRef<HTMLElement>>('hero');

  protected readonly gov = computed(() => {
    const s = this.slide();
    return s.kind === 'gov'
      ? { name: s.name, ...interimGov(s.wilayat, this.store.results()) }
      : null;
  });
  protected readonly featured = computed((): InterimRow | null => {
    const g = this.gov();
    if (!g) return null;
    const sp = this.spot();
    return g.rows.find((r) => r.i === sp) ?? g.rows[0] ?? null;
  });
  protected readonly lit = computed(() => this.featured()?.id ?? null);

  constructor() {
    effect(() => {
      this.lit();
      const el = this.hero()?.nativeElement;
      if (el) untracked(() => restartAnimation(el, 'swap'));
    });
  }

  protected rows(f: InterimRow): number {
    return Math.ceil((f.rest.length + (f.other ? 1 : 0)) / 2);
  }

  protected seatCols(n: number): number {
    return n <= 3 ? n : n === 4 ? 2 : 3;
  }

  protected votes(n: number): { n: string } {
    return { n: fmt(n) };
  }
}
