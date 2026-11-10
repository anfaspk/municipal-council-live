import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { pct, pctOf } from '../../../domain/format';
import { hourLabels, turnoutCurve } from '../../../domain/stats/stats';
import { band } from '../../../domain/stats/turnout';
import { CountUpDirective } from '../../../shared/motion/count-up.directive';
import { IconComponent } from '../../../shared/ui/icon.component';
import { sparkGeom } from '../../../shared/ui/marks';
import { TPipe } from '../../../shared/ui/t.pipe';
import { uid } from '../../../shared/ui/uid';
import { DrawerGenderComponent } from './drawer-gender.component';
import { DrawerKpiComponent } from './drawer-kpi.component';
import { barPos, DrawerWilRowComponent } from './drawer-wil-row.component';
import { deltaText, dSort } from './drawer.model';
import { DrawerState } from './drawer.state';

const RING = { size: 120, sw: 9, r: (120 - 9) / 2, c: 2 * Math.PI * ((120 - 9) / 2) };

@Component({
  selector: 'section[data-tab=ov]',
  imports: [
    CountUpDirective,
    IconComponent,
    TPipe,
    DrawerGenderComponent,
    DrawerKpiComponent,
    DrawerWilRowComponent,
  ],
  templateUrl: './drawer-overview.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerOverviewComponent {
  readonly pick = output<string>();
  readonly more = output<void>();
  protected readonly ring = RING;
  protected readonly bar = barPos;
  protected readonly sparkId = uid('sp');
  private readonly drawer = inject(DrawerState);

  protected readonly view = computed(() => {
    const s = this.drawer.snap();
    if (!s) return null;
    const g = s.g,
      n = s.nat,
      tg = this.drawer.gt(),
      b = band(tg),
      curve = turnoutCurve(g.hours, g.reg);
    return {
      g,
      t: tg,
      band: b,
      delta: tg - n.turnout,
      deltaText: deltaText(tg - n.turnout, t('pts'), t('vsNat')),
      nat: n.turnout,
      natLabel: t('natAvg', { p: pct(n.turnout) }),
      rank: s.rank,
      of: s.of,
      arc: ((RING.c * Math.min(100, tg)) / 100).toFixed(2) + ' ' + RING.c.toFixed(2),
      votedSub: pctOf(g.voted, n.voted) + ' ' + t('ofNat'),
      yetSub: pctOf(g.reg - g.voted, g.reg) + ' ' + t('remainingWord'),
      top: dSort(s.rows, 'turnout', (r) => r.name).slice(0, 3),
      count: s.rows.length,
      color: 'var(--band-' + b + ')',
      spark: sparkGeom(curve.vals, 540, 92, { min: 0, max: Math.max(100, tg) }),
      hours: hourLabels(curve.from, curve.to, 5),
    };
  });
}
