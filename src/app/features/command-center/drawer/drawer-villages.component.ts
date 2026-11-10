import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { t, tParts } from '../../../core/i18n/i18n';
import { pctOf } from '../../../domain/format';
import { band } from '../../../domain/stats/turnout';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { IconComponent } from '../../../shared/ui/icon.component';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { SegComponent } from '../../../shared/ui/seg.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { DrawerGenderComponent } from './drawer-gender.component';
import { DrawerKpiComponent } from './drawer-kpi.component';
import { barPos } from './drawer-wil-row.component';
import { SORT_ITEMS } from './drawer-wilayat.component';
import { BANDS_DOWN, deltaText, SortKey } from './drawer.model';
import { DrawerState } from './drawer.state';

@Component({
  selector: 'section[data-tab=vil]',
  imports: [
    CountUpDirective,
    IconComponent,
    FmtPipe,
    PctPipe,
    SegComponent,
    TPipe,
    DrawerGenderComponent,
    DrawerKpiComponent,
  ],
  templateUrl: './drawer-villages.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerVillagesComponent {
  readonly pick = output<string>();
  readonly sort = output<SortKey>();
  readonly query = output<string>();
  readonly openVil = output<number>();
  readonly page = output<number>();
  protected readonly state = inject(CommandCenterState);
  protected readonly drawer = inject(DrawerState);
  protected readonly sortItems = SORT_ITEMS;
  protected readonly bands = BANDS_DOWN;
  protected readonly str = { loading: t('vilLoading'), loadingV: t('vilLoadingOne') };
  protected readonly band = band;
  protected readonly bar = barPos;

  protected readonly head = computed(() => {
    const w = this.drawer.w(),
      s = this.drawer.snap();
    if (!w || !s) return null;
    const g = s.g,
      n = w.vil ? w.vil.length : null;
    return {
      w,
      band: band(w.t),
      rank: t('ofWil', { n: w.rank, m: s.rows.length, g: g.ar }),
      count: n,
      countText: n === null ? '' : t('vilCount', { n }),
      delta: w.t - this.drawer.gt(),
      deltaText: deltaText(w.t - this.drawer.gt(), t('pts'), t('vsGov')),
      votedSub: pctOf(w.voted, Math.max(1, g.voted)) + ' ' + t('ofGov'),
      yetSub: pctOf(w.reg - w.voted, w.reg) + ' ' + t('remainingWord'),
    };
  });

  protected openLabel(name: string): string {
    return t('vilOpen', { v: name });
  }
  protected readonly none = computed(() => t('noVil', { q: this.drawer.q().trim() }));
  protected readonly detail = computed(() => {
    const d = this.drawer.detail();
    if (!d) return null;
    return {
      d,
      turnoutBy: tParts(
        'turnoutBy',
        { m: pctOf(d.voted.m, d.reg.m), f: pctOf(d.voted.f, d.reg.f) },
        ['m', 'f'],
      ),
    };
  });
  protected input(e: Event): void {
    this.query.emit((e.target as HTMLInputElement).value);
  }
  protected key(e: KeyboardEvent, vid: number): void {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    this.openVil.emit(vid);
  }
}
