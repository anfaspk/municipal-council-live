import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { TurnoutStore } from '../../../data/turnout.store';
import { pctOf } from '../../../domain/format';
import { BaseField } from '../../../domain/stats/stats';
import { BootFlag } from '../../../shared/motion/boot';
import { Kpi, KpiTileComponent } from '../../../shared/ui/kpi-tile.component';

const share = (part: number, whole: number): number => (whole ? (part / whole) * 100 : 0);

@Component({
  selector: 'section.cc-kpis',
  imports: [KpiTileComponent],
  template: `<div class="mj-glass mj-tile k1" [kpi]="tiles()[0]" [value]="values()[0]"></div>
    <div class="mj-glass mj-tile k2" [kpi]="tiles()[1]" [value]="values()[1]"></div>
    <div class="mj-glass mj-tile k3" [kpi]="tiles()[2]" [value]="values()[2]"></div>
    <div class="mj-glass mj-tile k4" [kpi]="tiles()[3]" [value]="values()[3]"></div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpisComponent {
  private readonly stats = inject(TurnoutStore);
  private readonly instant = !inject(BootFlag).first;
  protected readonly values = computed(
    (): [number | null, number | null, number | null, number] => {
      const n = this.stats.national(),
        known = (k: BaseField, v: number) => (n.unread.includes(k) ? null : v);
      return [
        known('population', n.population),
        known('registered', n.registered),
        known('regF', n.regF),
        n.voted,
      ];
    },
  );
  protected readonly tiles = computed((): [Kpi, Kpi, Kpi, Kpi] => {
    const n = this.stats.national(),
      instant = this.instant,
      of = (a: BaseField | null, b: BaseField, part: number, whole: number) =>
        (a && n.unread.includes(a)) || n.unread.includes(b) ? '—' : pctOf(part, whole);
    const zero = new Array(14).fill(0),
      hv = n.hours.map((h) => h.v);
    return [
      {
        label: t('population'),
        icon: 'people',
        ring: 100,
        ringColor: 'var(--data-cyan)',
        foot: t('base'),
        spark: zero,
        instant,
      },
      {
        label: t('registered'),
        icon: 'badge',
        ring: share(n.registered, n.population),
        foot: of('registered', 'population', n.registered, n.population) + ' ' + t('ofPop'),
        spark: zero,
        instant,
      },
      {
        label: t('registeredF'),
        icon: 'people',
        ring: share(n.regF, n.registered),
        ringColor: 'var(--female)',
        foot: of('regF', 'registered', n.regF, n.registered) + ' ' + t('ofRegd'),
        spark: zero,
        sparkColor: 'var(--female)',
        instant,
      },
      {
        label: t('totalVoted'),
        icon: 'ballot',
        ring: n.turnout,
        ringColor: 'var(--declared)',
        foot: of(null, 'registered', n.voted, n.registered) + ' ' + t('ofRegd'),
        spark: (hv.length < 2 ? [0, 0, ...hv] : hv).slice(-14),
        sparkColor: 'var(--declared)',
        instant,
      },
    ];
  });
}
