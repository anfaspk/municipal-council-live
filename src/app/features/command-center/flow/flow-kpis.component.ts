import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { SnapItemDirective, SnapRowComponent } from '../../../shared/ui/snaprow/snaprow.component';
import { DashboardView } from './dashboard.view';
import { FlTPipe } from './fl-t.pipe';

@Component({
  selector: 'div[flKpis]',
  imports: [SnapRowComponent, SnapItemDirective, FlTPipe],
  host: { class: 'fl-kpis' },
  template: `<div mjSnapRow [label]="'flKpis' | flT">@for (k of view.kpis(); track k.fig) {<article mjSnapItem class="fl-tile"><p>{{ k.label }}</p><b [attr.data-fig]="k.fig">{{ k.value }}</b><small>{{ k.foot }}</small></article>}</div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowKpisComponent {
  protected readonly view = inject(DashboardView);
}
