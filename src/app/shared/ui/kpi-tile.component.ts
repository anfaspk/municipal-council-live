import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { IconComponent, IconName } from './icon.component';
import { OdometerComponent } from '../motion/odometer.component';
import { ringGeom } from './marks';
import { uid } from './uid';
import { pct } from '../../domain/format';

export interface Kpi {
  label: string;
  icon: IconName;
  foot: string;
  instant: boolean;
  ring: number;
  ringColor?: string;
  spark: number[];
  sparkColor?: string;
}

@Component({
  selector: '.mj-tile',
  imports: [IconComponent, OdometerComponent],
  host: { class: 'mj-kpi' },
  templateUrl: './kpi-tile.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiTileComponent {
  readonly kpi = input.required<Kpi>();
  readonly value = input.required<number | null>();
  readonly pct = pct;
  readonly id = uid('sp');
  readonly ring = computed(() => ringGeom(this.kpi().ring, 38, 3.5));
  readonly spark = computed(() => {
    const vals = this.kpi().spark,
      w = 72,
      h = 22,
      pad = 3,
      n = vals.length;
    let mn = Math.min(...vals),
      mx = Math.max(...vals);
    if (mx === mn) {
      mx += 1;
      mn -= 1;
    }
    const pts = vals.map((v, i): [number, number] => [
      (n > 1 ? i / (n - 1) : 1) * (w - pad * 2) + pad,
      h - pad - ((v - mn) / (mx - mn)) * (h - pad * 2),
    ]);
    const d = pts
        .map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1))
        .join(' '),
      last = pts[n - 1]!;
    return {
      w,
      h,
      d,
      area: d + ' L' + last[0].toFixed(1) + ' ' + h + ' L' + pad + ' ' + h + 'Z',
      cx: last[0].toFixed(1),
      cy: last[1].toFixed(1),
    };
  });
}
