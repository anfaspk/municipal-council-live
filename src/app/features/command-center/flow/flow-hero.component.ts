import { t } from '../../../core/i18n/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';
import { TPipe } from '../../../shared/ui/t.pipe';
import { DashboardView } from './dashboard.view';
import { FlTPipe } from './fl-t.pipe';
import { flParts } from './flow-strings';
import { RING_R } from './flow.model';

@Component({
  selector: 'section[flHero]',
  imports: [TPipe, FlTPipe],
  host: { class: 'fl-card fl-hero', '[attr.aria-label]': 'label' },
  template: `@let n = view.nat();
    <div class="fl-ring" [class]="n.band"><svg viewBox="0 0 100 100" aria-hidden="true"><circle class="trk" cx="50" cy="50" [attr.r]="r"/><circle class="arc" cx="50" cy="50" [attr.r]="r" [attr.stroke-dasharray]="n.dash" transform="rotate(-90 50 50)"/></svg>
      <div class="fl-ring-in"><b class="fl-big" data-fig="nat.turnout">{{ n.pct }}</b><small>{{ 'natTurnout' | t }}</small></div></div>
    <p class="fl-say">@for (p of say(); track $index) {@if (p.fig) {<b [attr.data-fig]="p.fig">{{ p.text }}</b>} @else {{{ p.text }}}}</p>
    <div class="fl-chips"><span class="fl-chip band" [class]="n.band"><i aria-hidden="true"></i>{{ 'flBand-' + n.band | flT }}</span>@if (n.known) {<span class="fl-chip quiet">{{ 'flYet' | flT: { n: n.yet } }}</span>}</div>
    @if (n.spark.points) {<div class="fl-spark" dir="ltr" role="img" [attr.aria-label]="'flSpark' | flT"><svg viewBox="0 0 320 40" preserveAspectRatio="none" aria-hidden="true"><polyline [attr.points]="n.spark.points"/></svg><span>{{ n.spark.from }}</span><span>{{ 'flNow' | flT }}</span></div>}`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowHeroComponent {
  protected readonly label = t('natTurnout');
  protected readonly view = inject(DashboardView);
  protected readonly r = RING_R;
  protected readonly say = computed(() => {
    const n = this.view.nat(),
      figs = ['nat.voted', 'nat.registered'];
    let k = 0;
    return flParts('flSay', { v: n.voted, r: n.reg }, ['v', 'r']).map((p) => ({
      text: p.text,
      fig: p.bold ? (figs[k++] ?? null) : null,
    }));
  });
}
