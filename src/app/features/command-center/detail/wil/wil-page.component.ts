import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../../data/turnout.store';
import { Counts } from '../../../../domain/stats/stats';
import { band, turnout } from '../../../../domain/stats/turnout';
import { GaugeComponent } from '../../../../shared/ui/gauge.component';
import { BandStripComponent } from '../charts/band-strip.component';
import { DetailHold } from '../detail-hold';
import { dt } from '../detail-strings';
import { DetailState } from '../detail.state';
import { DtTPipe } from '../dt-t.pipe';
import { natTurnout } from '../gov/gov.model';
import { AgeBarsComponent } from '../parts/age-bars.component';
import { CompareComponent } from '../parts/compare.component';
import { FlowComponent } from '../parts/flow.component';
import { GenderComponent } from '../parts/gender.component';
import { compareModel, flowModel } from '../parts/place.model';
import { RhythmComponent } from '../parts/rhythm.component';
import { LocatorCardComponent } from './locator-card.component';
import { VillagesComponent } from './villages.component';

const GAUGE = 204;

@Component({
  selector: 'div[dtWilPage]',
  imports: [
    AgeBarsComponent,
    BandStripComponent,
    CompareComponent,
    DtTPipe,
    FlowComponent,
    GaugeComponent,
    GenderComponent,
    LocatorCardComponent,
    RhythmComponent,
    VillagesComponent,
  ],
  templateUrl: './wil-page.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WilPageComponent {
  readonly gid = input.required<string>();
  readonly wid = input.required<number>();
  readonly rank = input<number | null>(null);
  readonly of = input<number | null>(null);

  private readonly stats = inject(TurnoutStore);
  private readonly detail = inject(DetailState);
  private readonly hold = inject(DetailHold);
  protected readonly gauge = GAUGE;

  protected readonly gov = computed(() => this.stats.gov(this.gid()));
  protected readonly wil = computed(() => this.gov()?.wils.find((w) => w.id === this.wid()));
  private readonly own = computed(() => {
    this.hold.tick();
    return this.stats.wilayat(this.wid());
  });
  protected readonly villages = computed(() => {
    this.hold.tick();
    return this.stats.villages(this.wid());
  });
  protected readonly t = computed(() => {
    const w = this.wil();
    return w ? turnout(w) : 0;
  });
  protected readonly band = computed(() => band(this.t()));
  protected readonly cmp = computed(() => {
    const g = this.gov(),
      w = this.wil();
    return compareModel([
      { key: 'self', label: w?.name ?? '…', t: w ? this.t() : null },
      { key: 'up', label: g?.ar ?? '…', t: g && g.reg > 0 ? turnout(g) : null },
      { key: 'nat', label: dt('dtNatL'), t: natTurnout(this.stats.national()) },
    ]);
  });
  protected readonly reg = computed((): Counts => ({
    t: this.wil()?.reg ?? 0,
    m: this.wil()?.regM ?? 0,
    f: this.wil()?.regF ?? 0,
  }));
  protected readonly voted = computed((): Counts => ({
    t: this.wil()?.voted ?? 0,
    m: this.wil()?.votedM ?? 0,
    f: this.wil()?.votedF ?? 0,
  }));
  protected readonly flow = computed(() => flowModel(this.own()?.pop, this.reg(), this.voted()));
  protected readonly series = computed(() => {
    const w = this.wil();
    return { hours: w?.hours ?? [], reg: w?.reg ?? 0 };
  });
  protected readonly govSeries = computed(() => {
    const g = this.gov();
    return g && g.reg > 0 ? { hours: g.hours, reg: g.reg } : null;
  });
  protected readonly strip = computed(() =>
    (this.villages() ?? []).map((v) => ({ id: v.id, name: v.ar, t: v.t })),
  );

  protected sibling(wil: number): void {
    this.detail.sibling({ gov: this.gid(), wil });
  }
  protected open(vil: number): void {
    this.detail.open({ gov: this.gid(), wil: this.wid(), vil });
  }
}
