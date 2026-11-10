import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../../data/turnout.store';
import { VillageDetail } from '../../../../domain/stats/place';
import { band, turnout } from '../../../../domain/stats/turnout';
import { GaugeComponent } from '../../../../shared/ui/gauge.component';
import { DetailHold } from '../detail-hold';
import { dt } from '../detail-strings';
import { DetailState } from '../detail.state';
import { DtTPipe } from '../dt-t.pipe';
import { natTurnout } from '../gov/gov.model';
import { AgeBarsComponent } from '../parts/age-bars.component';
import { ColsComponent } from '../parts/cols.component';
import { CompareComponent } from '../parts/compare.component';
import { FlowComponent } from '../parts/flow.component';
import { GenderComponent } from '../parts/gender.component';
import { compareModel, flowModel } from '../parts/place.model';
import { RateComponent } from '../parts/rate.component';
import { LocatorCardComponent } from '../wil/locator-card.component';
import { NO_AGES, vilAges, vilTurnout } from './vil.model';

type Shown = VillageDetail | undefined;

const GAUGE = 204;
const SKEL = [0, 1, 2, 3, 4, 5],
  SKEL3 = [0, 1, 2],
  SKEL4 = [0, 1, 2, 3];

@Component({
  selector: 'div[dtVilPage]',
  imports: [
    AgeBarsComponent,
    ColsComponent,
    CompareComponent,
    DtTPipe,
    FlowComponent,
    GaugeComponent,
    GenderComponent,
    LocatorCardComponent,
    RateComponent,
  ],
  host: { '[class.dt-busy]': 'busy()' },
  templateUrl: './vil-page.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VilPageComponent {
  readonly gid = input.required<string>();
  readonly wid = input.required<number>();
  readonly vid = input.required<number>();
  readonly rank = input<number | null>(null);
  readonly of = input<number | null>(null);

  private readonly stats = inject(TurnoutStore);
  private readonly detail = inject(DetailState);
  private readonly hold = inject(DetailHold);
  protected readonly gauge = GAUGE;
  protected readonly skel = SKEL;
  protected readonly skel3 = SKEL3;
  protected readonly skel4 = SKEL4;

  protected readonly gov = computed(() => this.stats.gov(this.gid()));
  private readonly wil = computed(() => this.gov()?.wils.find((w) => w.id === this.wid()));
  protected readonly villages = computed(() => {
    this.hold.tick();
    return this.stats.villages(this.wid());
  });
  protected readonly row = computed(() => this.villages()?.find((v) => v.id === this.vid()));
  private last: Shown;
  protected readonly data = computed((): Shown => {
    this.hold.tick();
    return (this.last = this.stats.villageDetail(this.vid()) ?? this.last);
  });
  protected readonly busy = computed(() => {
    const d = this.data();
    return !!d && d.id !== this.vid();
  });
  private readonly own = computed(() => {
    const d = this.data();
    return d?.id === this.vid() ? d : undefined;
  });

  protected readonly turnoutNow = computed(() => vilTurnout(this.own(), this.row()));
  protected readonly band = computed(() => {
    const t = this.turnoutNow();
    return t === null ? null : band(t);
  });
  protected readonly wilT = computed(() => {
    const w = this.wil();
    return w && w.reg > 0 ? turnout(w) : null;
  });
  protected readonly cmp = computed(() =>
    compareModel([
      { key: 'self', label: this.row()?.ar ?? '…', t: this.turnoutNow() },
      { key: 'up', label: this.wil()?.name ?? '…', t: this.wilT() },
      { key: 'nat', label: dt('dtNatL'), t: natTurnout(this.stats.national()) },
    ]),
  );
  protected readonly flow = computed(() => {
    const d = this.data();
    return d ? flowModel(d.pop, d.reg, d.voted, d.notVoted) : null;
  });
  protected readonly ages = computed(() => {
    const d = this.data();
    return d ? vilAges(d) : NO_AGES;
  });
  protected readonly none = computed(() => this.data()?.voted.t === 0);
  protected readonly places = computed(() =>
    (this.villages() ?? []).map((v) => ({ id: v.id, name: v.ar, t: v.t })),
  );

  protected sibling(vil: number): void {
    this.detail.sibling({ gov: this.gid(), wil: this.wid(), vil });
  }
  protected openWil(wil: number): void {
    this.detail.open({ gov: this.gid(), wil });
  }
}
