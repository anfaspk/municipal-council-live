import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CGov, CNat, countGov } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { fmt, pct } from '../../../domain/format';
import { IconComponent } from '../../../shared/ui/icon.component';
import { CountStats, CountTableHead } from './panel-parts';

@Component({
  selector: 'div.cx-natp',
  templateUrl: './national-panel.component.html',
  imports: [IconComponent, CountStats, CountTableHead],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NationalPanel {
  readonly national = input.required<CNat>();
  readonly governors = input.required<CGov[]>();
  protected readonly rows = computed(() =>
    this.governors().map((gov) => ({
      gov,
      sum: countGov(gov),
      gender: gov.wil.reduce((a, w) => ({ m: a.m + w.m, f: a.f + w.f }), { m: 0, f: 0 }),
    })),
  );
  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly percent = pct;
  protected readonly decimal = (n: number) => n.toFixed(1);
}
