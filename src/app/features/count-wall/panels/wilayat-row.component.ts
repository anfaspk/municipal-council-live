import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { CWil, countRace } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { fmt, pct } from '../../../domain/format';
import { IconComponent } from '../../../shared/ui/icon.component';
import { CountAvatar, CountStatus } from './panel-parts';
@Component({
  selector: 'button[countWilayatRow]',
  templateUrl: './wilayat-row.component.html',
  imports: [IconComponent, CountAvatar, CountStatus],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WilayatRow {
  readonly wilayat = input.required<CWil>({ alias: 'countWilayatRow' });
  readonly live = signal<CWil | null>(null);
  readonly revision = signal(0);
  protected readonly current = computed(() => this.live() ?? this.wilayat());
  protected readonly lead = computed(() => countRace(this.current()).top[0]);
  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly percent = pct;
  protected readonly share = computed(() =>
    this.wilayat().cast ? (this.wilayat().counted / this.wilayat().cast) * 100 : 0,
  );
  protected readonly decimal = (n: number) => n.toFixed(1);
  update(w: CWil): void {
    this.live.set(w);
    this.revision.update((n) => n + 1);
  }
}
