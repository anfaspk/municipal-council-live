import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { pct } from '../../../../domain/format';
import { short } from '../charts/chart';
import { boxOf } from '../charts/chart-box';
import { dt } from '../detail-strings';
import { RegionPin, regionGeo, RegionWil } from '../region-geometry';
import { locLabel } from './wil.model';

@Component({
  selector: 'div.dt-loc',
  templateUrl: './locator-card.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocatorCardComponent {
  readonly gid = input.required<string>();
  readonly gname = input.required<string>();
  readonly rows = input.required<readonly RegionWil[]>();
  readonly wid = input.required<number>();
  readonly pick = output<number>();

  private readonly box = boxOf();
  protected readonly over = signal<number | null>(null);
  protected readonly geo = computed(() => regionGeo(this.gid(), this.rows(), this.box()));
  protected readonly me = computed(() => this.geo()?.pins.find((p) => p.id === this.wid()) ?? null);
  protected readonly labels = computed(() => {
    const g = this.geo();
    if (!g) return [];
    const me = this.me(),
      o = this.over(),
      other = o === null || o === this.wid() ? undefined : g.pins.find((p) => p.id === o),
      mine = me ? locLabel(me, g.w, g.h) : undefined,
      out = [];
    if (me && mine) out.push({ id: me.id, me: true, name: short(me.name), ...mine });
    if (other)
      out.push({
        id: other.id,
        me: false,
        name: short(other.name),
        ...locLabel(other, g.w, g.h, mine),
      });
    return out;
  });
  protected readonly label = computed(() => {
    const me = this.rows().find((r) => r.id === this.wid());
    return dt('dtLocL', { p: me?.name ?? '…', g: this.gname() });
  });

  protected say(p: RegionPin): string {
    return dt('dtPinL', { p: p.name, t: pct(p.t), n: p.voted });
  }
  protected go(p: RegionPin): void {
    if (p.id !== this.wid()) this.pick.emit(p.id);
  }
}
