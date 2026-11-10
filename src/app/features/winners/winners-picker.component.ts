import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { IconComponent } from '../../shared/ui/icon.component';
import { wt } from './winners-strings';
import { GovCard, omanMap } from './winners.model';
import { WnTPipe } from './wn-t.pipe';

const MAP = omanMap();

@Component({
  selector: 'div.wn-pick[wnPicker]',
  imports: [IconComponent, WnTPipe],
  host: {
    '(click)': 'onMap($event)',
    '(pointerover)': 'onOver($event)',
    '(pointerout)': 'onOut($event)',
  },
  templateUrl: './winners-picker.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinnersPickerComponent {
  readonly cards = input.required<GovCard[]>();
  readonly wait = input(false);
  readonly sums = input<ReadonlyMap<number, { done: number; all: number }>>(new Map());
  readonly pick = output<string>();

  protected readonly map = MAP;
  protected readonly hot = signal<string | null>(null);
  protected readonly hotGov = computed(() => MAP.govs.find((g) => g.id === this.hot()) ?? null);
  protected readonly hotName = computed(
    () => this.cards().find((c) => c.id === this.hot())?.name ?? '',
  );

  protected wilsLabel(n: number): string {
    return n ? wt('wilCount', { n }) : '';
  }
  protected two(n: number): string {
    return String(n).padStart(2, '0');
  }
  protected sum(c: GovCard): { done: number; all: number } | null {
    const s = this.sums().get(c.apiId);
    return s && s.all ? s : null;
  }

  protected onMap(e: Event): void {
    const g = (e.target as Element | null)?.closest?.('[data-mg]')?.getAttribute('data-mg');
    if (g) this.pick.emit(g);
  }
  protected onOver(e: Event): void {
    const g = (e.target as Element | null)?.closest?.('[data-mg]')?.getAttribute('data-mg');
    if (g) this.hot.set(g);
  }
  protected onOut(e: PointerEvent): void {
    const to = (e.relatedTarget as Element | null)?.closest?.('[data-mg], .wn-gov');
    if (!to) this.hot.set(null);
  }
}
