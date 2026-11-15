import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { DashboardView } from './dashboard.view';
import { FlTPipe } from './fl-t.pipe';
import { fl } from './flow-strings';

@Component({
  selector: 'section[flPodium]',
  imports: [FlTPipe],
  host: { class: 'fl-card fl-podium', '[attr.aria-label]': 'label' },
  template: `<div class="fl-sec"><div><p class="fl-micro">{{ 'flPodiumMicro' | flT }}</p><h2 class="fl-h2">{{ 'flPodiumT' | flT }}</h2></div></div>
    <div class="fl-steps">@for (s of steps(); track s.id) {<button type="button" class="fl-step" [class]="'s' + s.rank" (click)="pick.emit(s.id)"><b>{{ s.ar }}</b><span class="fl-blk"><em>{{ s.rank }}</em><small>{{ s.pct }}</small></span></button>}</div>
    <ol class="fl-more">@for (r of more(); track r.id) {<li><button type="button" class="fl-prow" (click)="pick.emit(r.id)"><span class="fl-rank" [class]="r.band">{{ r.rank }}</span><span class="fl-row-main"><b>{{ r.ar }}</b><span class="fl-track" aria-hidden="true"><span class="fl-fill" [class]="r.band" [style.--k]="r.t / 100"></span></span></span><b class="fl-ink" [class]="r.band">{{ r.pct }}</b></button></li>}</ol>`,
  styleUrls: ['./flow-podium.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowPodiumComponent {
  protected readonly label = fl('flPodiumMicro');
  private readonly view = inject(DashboardView);
  readonly pick = output<string>();
  private readonly byRank = computed(() => [...this.view.rows()].sort((a, b) => a.rank - b.rank));
  protected readonly steps = computed(() => {
    const [a, b, c] = this.byRank();
    return [b, a, c].filter((x) => !!x);
  });
  protected readonly more = computed(() => this.byRank().slice(3, 5));
}
