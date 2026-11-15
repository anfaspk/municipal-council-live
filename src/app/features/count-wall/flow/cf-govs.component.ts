import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { CfIconComponent } from './cf-icon.component';
import { CfMapComponent } from './cf-map.component';
import { CfTPipe } from './cf-t.pipe';
import { ST_KEY, STATUSES } from './count-flow.model';
import { CountView } from './count.view';

@Component({
  selector: 'section[cfGovs]',
  imports: [CfIconComponent, CfMapComponent, CfTPipe],
  host: { class: 'cf-block cf-govs' },
  template: `<div class="cf-sec"><div><p class="cf-micro">{{ 'cfGovs' | cfT }}</p><h2 class="cf-h2">{{ 'cfGovsH' | cfT }}</h2></div><span class="cf-count">{{ 'govCount' | cfT: { n: view.rows().length } }}</span></div>
    <div class="cf-seg" role="group" [attr.aria-label]="'cfViews' | cfT"><button type="button" [class.on]="!map()" [attr.aria-pressed]="!map()" (click)="map.set(false)">{{ 'cfList' | cfT }}</button><button type="button" [class.on]="map()" [attr.aria-pressed]="map()" (click)="map.set(true)">{{ 'cfMap' | cfT }}</button></div>
    @if (map()) {
      <div class="cf-card cf-mapcard"><div cfMap [govs]="view.store.govs" (pickGov)="pick.emit($event)"></div>
        <ul class="cf-legend">@for (s of statuses; track s) {<li [class]="'cf-st ' + s"><i class="cf-dot" aria-hidden="true"></i>{{ st[s] | cfT }}</li>}</ul></div>
    }
    <ol class="cf-rows">
      @for (r of view.rows(); track r.id) {
        <li><button type="button" [class]="'cf-row cf-st ' + r.st" [attr.data-g]="r.id" (click)="pick.emit(r.id)">
          <i class="cf-dot" aria-hidden="true"></i>
          <span class="cf-row-m"><b class="cf-row-n">{{ r.name }}@if (r.ties) {<span class="cf-tie" [attr.aria-label]="'cfTiesL' | cfT: { n: r.ties }"><svg cfIcon="star"></svg>{{ 'cfTies' | cfT: { n: r.ties } }}</span>}</b>
            <span class="cf-segbar thin" aria-hidden="true">@for (s of r.segs; track s.st) {<i [class]="'cf-st ' + s.st" [style.--k]="s.k"></i>}</span>
            <small>{{ 'cfDoneOf' | cfT: { d: r.done, n: r.n } }} · {{ st[r.st] | cfT }}</small></span>
          <span class="cf-row-e"><b class="mj-num" [attr.data-fig]="'count.gov.' + r.id + '.p'">{{ r.p }}</b><small class="mj-num" [attr.data-fig]="'count.gov.' + r.id + '.counted'">{{ r.counted }}</small></span>
          <svg cfIcon="go" class="cf-go"></svg>
        </button></li>
      }
    </ol>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfGovsComponent {
  protected readonly view = inject(CountView);
  readonly pick = output<string>();
  protected readonly map = signal(false);
  protected readonly statuses = STATUSES;
  protected readonly st = ST_KEY;
}
