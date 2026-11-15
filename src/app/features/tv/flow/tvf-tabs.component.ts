import { ChangeDetectionStrategy, Component, inject, ViewEncapsulation } from '@angular/core';
import { TvInterimTab } from '../tv-interim-tab';
import { TvView } from '../tv.view';
import { TvfTPipe } from './tvf-t.pipe';

@Component({
  selector: 'div[tvfTabs]',
  imports: [TvfTPipe],
  host: { class: 'tvf-tabbar' },
  template: `<h1 class="tvf-tgov">{{ view.gov()?.name }}</h1>
    <div class="tvf-seg" role="tablist" [attr.aria-label]="'intTabs' | tvfT">
      <button type="button" role="tab" [class.on]="tab() === 'inter'" [attr.aria-selected]="tab() === 'inter'" [tabIndex]="tab() === 'inter' ? 0 : -1" (click)="tab.set('inter')" (keydown)="key($event)">{{ 'intTab' | tvfT }}</button>
      <button type="button" role="tab" [class.on]="tab() === 'info'" [attr.aria-selected]="tab() === 'info'" [tabIndex]="tab() === 'info' ? 0 : -1" (click)="tab.set('info')" (keydown)="key($event)">{{ 'infoTab' | tvfT }}</button>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfTabsComponent {
  protected readonly view = inject(TvView);
  protected readonly tab = inject(TvInterimTab).tab;
  protected key(e: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const to =
      e.key === 'Home'
        ? 'inter'
        : e.key === 'End'
          ? 'info'
          : this.tab() === 'inter'
            ? 'info'
            : 'inter';
    this.tab.set(to);
    const btn = (e.currentTarget as HTMLElement).parentElement?.querySelectorAll('button')[
      to === 'inter' ? 0 : 1
    ];
    btn?.focus();
  }
}
