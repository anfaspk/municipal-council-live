import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../shared/ui/tv-strings';
import { LOGO, LOGO_DARK, MOI_LOGO, MOI_LOGO_DARK } from '../../../shared/ui/brand';
import { CountUpDirective, CountUpGroup } from '../../../shared/motion/count-up.directive';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { TvTPipe as TPipe } from '../../../shared/ui/tv-t.pipe';
import { TvSlide } from '../tv-slide.model';
import { TvCountryMapComponent } from './tv-country-map.component';
import { TvCurveComponent } from './tv-curve.component';
import { TvGenderComponent } from './tv-gender.component';
import { TvLocatorComponent } from './tv-locator.component';
import { TvRegionColumnsComponent } from './tv-region-columns.component';
import { TvRegionShapeComponent } from './tv-region-shape.component';
import { TvSlideState } from './tv-slide-state';
import { TvStatsComponent } from './tv-stats.component';
import { TvWilayatTableComponent } from './tv-wilayat-table.component';
import { BANDS } from '../../../domain/stats/turnout';
import { TurnoutStore } from '../../../data/turnout.store';
import { InterimStore } from '../../../data/interim.store';
import { timeLeft } from '../../../domain/interim/interim';
import { IconComponent } from '../../../shared/ui/icon.component';
import { InterimTabKey, TvInterimTab } from '../tv-interim-tab';
import { TvInterimComponent } from './tv-interim.component';

@Component({
  selector: 'div[appTvSlide]',
  imports: [
    CountUpDirective,
    FmtPipe,
    PctPipe,
    TPipe,
    TvStatsComponent,
    TvGenderComponent,
    TvCurveComponent,
    TvWilayatTableComponent,
    TvCountryMapComponent,
    TvRegionShapeComponent,
    TvRegionColumnsComponent,
    TvLocatorComponent,
    TvInterimComponent,
    IconComponent,
  ],
  providers: [CountUpGroup, TvSlideState],
  host: {
    class: 'tv-sl',
    '[class]': 'slide().band',
    '[class.spot]': 'state.spot() >= 0',
    '[class.tv-pick]': 'inter() && !!gov()',
    '[style.--sp]': 'settled() ? "0s" : slide().split + "s"',
  },
  templateUrl: './tv-slide.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvSlideComponent {
  readonly slide = input.required<TvSlide>();
  readonly settled = input(false);

  protected readonly state = inject(TvSlideState);
  private readonly counters = inject(CountUpGroup);
  protected readonly staleAt = inject(TurnoutStore).staleAt;
  private readonly interim = inject(InterimStore);
  protected readonly phase = this.interim.phase;
  protected readonly fromAt = this.interim.fromAt;
  protected readonly inter = computed(() => this.phase() === 'open');
  protected readonly left = computed(() => {
    const l = this.interim.left();
    return l === null ? null : timeLeft(l);
  });
  protected readonly tab = inject(TvInterimTab).tab;
  protected readonly nat = computed(() => {
    const s = this.slide();
    return s.kind === 'nat' ? s : null;
  });
  protected readonly gov = computed(() => {
    const s = this.slide();
    return s.kind === 'gov' ? s : null;
  });
  protected readonly logo = LOGO;
  protected readonly logoDark = LOGO_DARK;
  protected readonly moi = MOI_LOGO;
  protected readonly moiDark = MOI_LOGO_DARK;
  protected readonly bands = BANDS;
  protected readonly registeredLower = t('registered').toLowerCase();

  constructor() {
    effect(() => {
      const g = this.gov();
      if (!g || !this.inter()) return;
      const w = g.wilayat[Math.max(0, this.state.spot())];
      if (w) untracked(() => this.interim.want(w.id));
    });
  }

  protected choose(tab: InterimTabKey): void {
    this.tab.set(tab);
  }
  countUp(group: 'show' | 'table' | 'labels'): void {
    this.counters.play(group);
  }
  live(on: boolean): void {
    this.counters.live = on;
  }
  spotlight(i: number): void {
    this.state.spot.set(i);
  }
  lit(): number {
    return this.state.spot();
  }
}
