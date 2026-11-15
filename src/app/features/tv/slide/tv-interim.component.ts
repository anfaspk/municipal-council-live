import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
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
import { FrameLoop } from '../../../shared/motion/frame-loop.service';
import { ListPager } from '../../../shared/motion/list-pager';
import { restartAnimation } from '../../../shared/motion/restart-animation';
import { FmtPipe, SharePipe } from '../../../shared/ui/format.pipes';
import { IconComponent } from '../../../shared/ui/icon.component';
import { RaceAvatarComponent } from '../../../shared/ui/race-avatar.component';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';
import { interimGov, InterimRow, seatCols } from '../tv-interim.model';
import { TvInterimTab } from '../tv-interim-tab';
import { TvSlide } from '../tv-slide.model';
import { TvWalk } from '../tv-walk';
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
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly walk = inject(TvWalk);
  private readonly tab = inject(TvInterimTab).tab;
  private readonly pager = new ListPager(inject(FrameLoop), this.walk.clock, 'tv');

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
  private readonly listed = computed(() => !!this.featured()?.wil);

  constructor() {
    effect(() => {
      this.lit();
      const el = this.hero()?.nativeElement;
      if (el) untracked(() => restartAnimation(el, 'swap'));
    });
    effect(() => {
      this.walk.shown();
      const on =
        this.walk.onView() === this.slide().uid &&
        this.lit() !== null &&
        this.listed() &&
        this.tab() === 'inter' &&
        !!this.list();
      untracked(() => {
        if (!on) return this.pager.stop();
        this.pager.run(() => this.list()?.nativeElement ?? null, {
          time: this.walk.left(),
          travel: !this.walk.still(),
          wait: (ms) => this.walk.wait(ms),
        });
      });
    });
    inject(DestroyRef).onDestroy(() => this.pager.stop());
  }

  protected readonly seatCols = seatCols;

  protected votes(n: number): { n: string } {
    return { n: fmt(n) };
  }
}
