import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  computed,
  input,
  viewChildren,
  ViewEncapsulation,
} from '@angular/core';
import { CGov, CWil, countGov, countRace } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { fmt, pct, sharePct } from '../../../domain/format';
import { IconComponent } from '../../../shared/ui/icon.component';
import { CountAvatar, CountStar, CountStats, CountTableHead } from './panel-parts';
import { WilayatRow } from './wilayat-row.component';

export const STATUS_TEXT = {
  await: 'stAwait',
  count: 'stCount',
  pend: 'cxCountedSt',
  decl: 'stDecl',
};
export const shareText = (vP: number | null): string => sharePct(vP);
@Component({
  selector: 'div.cx-gov',
  templateUrl: './governorate-panel.component.html',
  imports: [IconComponent, CountAvatar, CountStar, CountStats, CountTableHead, WilayatRow],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GovernoratePanel {
  readonly element: HTMLElement = inject(ElementRef).nativeElement;
  readonly governorate = input.required<CGov>();
  readonly results = input(false);
  private readonly rows = viewChildren(WilayatRow);
  protected readonly summary = computed(() => countGov(this.governorate()));
  protected readonly gender = computed(() =>
    this.governorate().wil.reduce((a, w) => ({ m: a.m + w.m, f: a.f + w.f }), { m: 0, f: 0 }),
  );
  protected readonly result = computed(() => {
    let seats = 0,
      filled = 0,
      closest: { w: CWil; gap: number } | null = null;
    for (const w of this.governorate().wil) {
      const race = countRace(w);
      seats += w.seats;
      if (w.st !== 'decl') continue;
      filled += w.seats;
      if (race.chaser && (!closest || race.gap < closest.gap)) closest = { w, gap: race.gap };
    }
    return { seats, filled, closest };
  });
  protected readonly cards = computed(() =>
    this.governorate().wil.map((w) => ({ w, race: countRace(w) })),
  );
  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly percent = pct;
  protected readonly share = shareText;
  protected readonly decimal = (n: number) => n.toFixed(1);
  protected readonly status = STATUS_TEXT;
  protected readonly ceil = Math.ceil;
  update(w: CWil): void {
    this.rows()
      .find((row) => row.wilayat().id === w.id)
      ?.update(w);
  }
}
