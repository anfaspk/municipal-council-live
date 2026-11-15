import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { uid } from '../uid';
import { summaryFigure, type SummaryKind } from './summary.model';

@Component({
  selector: 'article[mjSummary]',
  styleUrls: ['./summary.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mj-summary', '[attr.aria-labelledby]': "id + '-t'" },
  template: `<h3 class="mj-summary-t" [id]="id + '-t'">{{ heading() }}</h3>
  <p class="mj-summary-fig" [attr.data-fig]="fig()">{{ figure() }}</p>
  <p class="mj-summary-line">{{ sentence() }}</p>
  @if (chart()) {<button type="button" class="mj-btn mj-summary-more" [attr.aria-expanded]="open()" [attr.aria-controls]="id + '-c'" (click)="open.set(!open())">{{ open() ? lessL : moreL }}</button>
  <div class="mj-summary-chart" [id]="id + '-c'" [hidden]="!open()"><ng-content /></div>}`,
})
export class SummaryComponent {
  readonly heading = input.required<string>();
  readonly value = input<number | null>(null);
  readonly kind = input<SummaryKind>('num');
  readonly sentence = input('');
  readonly fig = input<string | null>(null);
  readonly chart = input(true);
  protected readonly open = signal(false);
  protected readonly id = uid('mj-sum');
  protected readonly moreL = t('summaryMore');
  protected readonly lessL = t('summaryLess');
  protected readonly figure = computed(() => summaryFigure(this.value(), this.kind()));
}
