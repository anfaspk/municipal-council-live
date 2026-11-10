import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  computed,
  input,
  signal,
  viewChildren,
  ViewEncapsulation,
} from '@angular/core';
import { CGov, CWil } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { IconComponent } from '../../../shared/ui/icon.component';
import { CountStar } from './panel-parts';
import { WilayatHead } from './wilayat-head.component';
import { RacePanel } from './race-panel.component';
import { WinnersPanel } from './winners-panel.component';
@Component({
  selector: 'div.cx-wil',
  templateUrl: './wilayat-panel.component.html',
  imports: [IconComponent, CountStar, WilayatHead, RacePanel, WinnersPanel],
  host: {
    '[attr.data-w]': 'wilayat().n',
    '[attr.data-st]': "wilayat().st === 'await' ? 'await' : 'on'",
    '[attr.data-c]': 'candidateIds()',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WilayatPanel {
  readonly element: HTMLElement = inject(ElementRef).nativeElement;
  readonly governorate = input.required<CGov>();
  readonly wilayat = input.required<CWil>();
  readonly results = input(false);
  private readonly live = signal<{ gov: CGov; wil: CWil } | null>(null);
  readonly revision = signal(0);
  protected readonly head = computed(
    () => this.live() ?? { gov: this.governorate(), wil: this.wilayat() },
  );
  protected readonly candidateIds = computed(() =>
    this.wilayat()
      .cands.map((c) => c.id)
      .sort()
      .join(' '),
  );
  protected readonly text = ct;
  private readonly races = viewChildren(RacePanel);
  updateRace(wil: CWil): void {
    this.races().forEach((r) => r.update(wil));
  }
  updateHead(gov: CGov, wil: CWil): void {
    this.live.set({ gov, wil });
    this.revision.update((n) => n + 1);
  }
}
