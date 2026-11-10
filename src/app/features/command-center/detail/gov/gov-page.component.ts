import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { TurnoutStore } from '../../../../data/turnout.store';
import { pct } from '../../../../domain/format';
import { Counts } from '../../../../domain/stats/stats';
import { band, turnout } from '../../../../domain/stats/turnout';
import { GaugeComponent } from '../../../../shared/ui/gauge.component';
import { SegComponent, SegItem } from '../../../../shared/ui/seg.component';
import { RankedListComponent } from '../charts/ranked-list.component';
import { RankInput, RankSort } from '../charts/ranked.model';
import { dt } from '../detail-strings';
import { DetailState } from '../detail.state';
import { DtTPipe } from '../dt-t.pipe';
import { AgeBarsComponent } from '../parts/age-bars.component';
import { CompareComponent } from '../parts/compare.component';
import { FlowComponent } from '../parts/flow.component';
import { GenderComponent } from '../parts/gender.component';
import { compareModel, flowModel } from '../parts/place.model';
import { RhythmComponent } from '../parts/rhythm.component';
import { natTurnout } from './gov.model';
import { RegionCardComponent } from './region-card.component';

const SORTS: readonly RankSort[] = ['turnout', 'votes', 'name'];
const GAUGE = 204;

@Component({
  selector: 'div[dtGovPage]',
  imports: [
    AgeBarsComponent,
    CompareComponent,
    DtTPipe,
    FlowComponent,
    GaugeComponent,
    GenderComponent,
    RankedListComponent,
    RegionCardComponent,
    RhythmComponent,
    SegComponent,
  ],
  templateUrl: './gov-page.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GovPageComponent {
  readonly gid = input.required<string>();
  readonly rank = input<number | null>(null);
  readonly of = input<number | null>(null);

  private readonly stats = inject(TurnoutStore);
  private readonly detail = inject(DetailState);
  protected readonly gauge = GAUGE;
  protected readonly pct = pct;
  protected readonly sorts: SegItem[] = SORTS.map((v) => ({ v, label: dt('dtSort.' + v) }));
  protected readonly sort = signal<RankSort>('turnout');
  protected readonly hot = signal<number | null>(null);

  protected readonly gov = computed(() => this.stats.gov(this.gid()));
  protected readonly t = computed(() => {
    const g = this.gov();
    return g ? turnout(g) : 0;
  });
  protected readonly band = computed(() => band(this.t()));
  protected readonly cmp = computed(() => {
    const g = this.gov();
    return compareModel([
      { key: 'self', label: g?.ar ?? '…', t: g ? this.t() : null },
      { key: 'nat', label: dt('dtNatL'), t: natTurnout(this.stats.national()) },
    ]);
  });
  protected readonly reg = computed((): Counts => ({
    t: this.gov()?.reg ?? 0,
    m: this.gov()?.regM ?? 0,
    f: this.gov()?.regF ?? 0,
  }));
  protected readonly voted = computed((): Counts => ({
    t: this.gov()?.voted ?? 0,
    m: this.gov()?.votedM ?? 0,
    f: this.gov()?.votedF ?? 0,
  }));
  protected readonly flow = computed(() => flowModel(this.gov()?.pop, this.reg(), this.voted()));
  protected readonly ranking = computed((): RankInput<number>[] =>
    (this.gov()?.wils ?? []).map((w) => ({ id: w.id, name: w.name, reg: w.reg, voted: w.voted })),
  );
  protected readonly series = computed(() => {
    const g = this.gov();
    return { hours: g?.hours ?? [], reg: g?.reg ?? 0 };
  });
  protected readonly natSeries = computed(() => {
    const n = this.stats.national();
    return n.unread.includes('registered') ? null : { hours: n.hours, reg: n.registered };
  });

  protected open(wil: number): void {
    this.detail.open({ gov: this.gid(), wil });
  }
}
