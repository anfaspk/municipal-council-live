import { t } from '../../../core/i18n/i18n';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { TickerStore } from '../../../data/ticker.store';
import { TPipe } from '../../../shared/ui/t.pipe';
import { tickWords } from '../ticker/tick-words';
import { FlTPipe } from './fl-t.pipe';

export const LATEST_SHOWN = 5;

@Component({
  selector: 'section[flLatest]',
  imports: [TPipe, FlTPipe],
  host: { class: 'fl-block fl-latest', '[attr.aria-label]': 'label' },
  template: `<div class="fl-sec"><p class="fl-micro">{{ 'ticker' | t }}</p>@if (more()) {<button type="button" class="fl-link" (click)="all.emit()">{{ 'flMore' | flT }}</button>}</div>
    <ul class="fl-lines">@for (l of lines(); track l.tick) {<li><time>{{ l.tick.time }}</time><span>@for (p of l.parts; track $index) {@if (p.bold) {<b>{{ p.text }}</b>} @else {{{ p.text }}}}</span></li>}</ul>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowLatestComponent {
  protected readonly label = t('ticker');
  private readonly ticker = inject(TickerStore);
  readonly all = output<void>();
  protected readonly lines = computed(() =>
    this.ticker
      .ticks()
      .slice(0, LATEST_SHOWN)
      .map((tick) => ({ tick, parts: tickWords(tick) })),
  );
  protected readonly more = computed(() => this.ticker.ticks().length > LATEST_SHOWN);
}
