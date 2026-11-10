import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Village } from '../../../../domain/stats/stats';
import { Band, BANDS } from '../../../../domain/stats/turnout';
import { IconComponent } from '../../../../shared/ui/icon.component';
import { SegComponent, SegItem } from '../../../../shared/ui/seg.component';
import { RankedListComponent } from '../charts/ranked-list.component';
import { RankSort } from '../charts/ranked.model';
import { dt } from '../detail-strings';
import { DtTPipe } from '../dt-t.pipe';
import { bandCounts, filterVillages, villageRows } from './villages.model';

const SORTS: readonly RankSort[] = ['turnout', 'votes', 'name'];
const SKELETON = [0, 1, 2, 3, 4, 5, 6, 7];

@Component({
  selector: 'div.dt-vils',
  imports: [DtTPipe, IconComponent, RankedListComponent, SegComponent],
  templateUrl: './villages.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VillagesComponent {
  readonly villages = input.required<readonly Village[] | undefined>();
  readonly ref = input<number | null>(null);
  readonly pick = output<number>();

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  protected readonly bandList = BANDS;
  protected readonly skeleton = SKELETON;
  protected readonly sorts: SegItem[] = SORTS.map((v) => ({ v, label: dt('dtSort.' + v) }));
  protected readonly q = signal('');
  protected readonly sort = signal<RankSort>('turnout');
  protected readonly bands = signal<readonly Band[]>([]);

  protected readonly counts = computed(() => bandCounts(this.villages() ?? []));
  protected readonly shown = computed(() =>
    filterVillages(this.villages() ?? [], this.q(), this.bands()),
  );
  protected readonly rows = computed(() => villageRows(this.shown()));
  protected readonly filtered = computed(() => !!this.q().trim() || this.bands().length > 0);
  protected readonly status = computed(() => {
    const all = this.villages()?.length ?? 0;
    return this.filtered()
      ? dt('dtVShown', { n: this.shown().length, m: all })
      : dt('dtVAll', { n: all });
  });

  protected toggle(b: Band): void {
    this.bands.update((l) => (l.includes(b) ? l.filter((x) => x !== b) : [...l, b]));
  }
  protected clear(): void {
    this.q.set('');
    this.bands.set([]);
  }
  protected down(e: Event): void {
    const row = this.host.querySelector<HTMLElement>('.dt-row');
    if (!row) return;
    e.preventDefault();
    row.focus();
  }
}
