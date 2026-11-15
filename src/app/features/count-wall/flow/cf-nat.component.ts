import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { CfRingComponent } from './cf-ring.component';
import { CfTPipe } from './cf-t.pipe';
import { ST_KEY, STATUSES } from './count-flow.model';
import { CountView } from './count.view';

@Component({
  selector: 'section[cfNat]',
  imports: [CfRingComponent, CfTPipe],
  host: { class: 'cf-card cf-nat' },
  template: `@let n = view.nat();
    <div [cfRing]="n.k"><b class="cf-ring-fig" data-fig="count.nat.p">{{ n.p }}</b><small>{{ 'cfBallots' | cfT }}</small></div>
    <p class="cf-say">{{ 'cfSay' | cfT: { c: n.counted, t: n.cast } }}</p>
    <span class="cf-segbar" aria-hidden="true">@for (s of n.segs; track s.st) {<i [class]="'cf-st ' + s.st" [style.--k]="s.k"></i>}</span>
    <ul class="cf-chips">@for (s of statuses; track s) {@if (n.counts[s]) {<li [class]="'cf-chip cf-st ' + s"><i class="cf-dot" aria-hidden="true"></i>{{ st[s] | cfT }}&ngsp;<b class="mj-num">{{ n.counts[s] }}</b></li>}}</ul>
    <div class="cf-figs">
      <div class="cf-fig left"><span>{{ 'cxUncounted' | cfT }}</span><b class="mj-num" data-fig="count.nat.left">{{ n.left }}</b></div>
      <div class="cf-fig m"><span>{{ 'cxMaleV' | cfT }}</span><b class="mj-num" data-fig="count.nat.m">{{ n.m }}</b><small class="mj-num">{{ n.mP }}</small></div>
      <div class="cf-fig f"><span>{{ 'cxFemaleV' | cfT }}</span><b class="mj-num" data-fig="count.nat.f">{{ n.f }}</b><small class="mj-num">{{ n.fP }}</small></div>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfNatComponent {
  protected readonly view = inject(CountView);
  protected readonly statuses = STATUSES;
  protected readonly st = ST_KEY;
}
