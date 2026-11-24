import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { IconComponent } from '../../../shared/ui/icon.component';
import { SegComponent, SegItem } from '../../../shared/ui/seg.component';
import { TPipe } from '../../../shared/ui/t.pipe';
import { DrawerWilRowComponent } from './drawer-wil-row.component';
import { wilList, WilSort } from './drawer.model';
import { DrawerState } from './drawer.state';

const WIL_SORT_ITEMS: SegItem[] = [
  { v: 'turnout', label: t('sTurnout') },
  { v: 'order', label: t('sOrder') },
];

@Component({
  selector: 'section[data-tab=wil]',
  imports: [IconComponent, SegComponent, TPipe, DrawerWilRowComponent],
  template: `<div class="dw-tools">
      <div
        class="dw-wsort mj-seg"
        [items]="sortItems"
        [value]="drawer.wSort()"
        (valueChange)="sort.emit($any($event))"
      ></div>
    </div>
    @if (drawer.snap()?.rowsAt; as at) {
      <p class="dw-note dw-stale">{{ 'wilFiguresAt' | t: { t: at } }}</p>
    }
    <div class="dw-wl dw-wfull">
      @for (r of rows(); track r.id; let i = $index) {
        <div class="dw-wrow">
          <button
            type="button"
            class="dw-wr"
            [row]="r"
            [index]="i"
            (click)="pick.emit(r.name)"
          ></button>
          <button
            type="button"
            class="mj-btn icon dw-wgo"
            [attr.aria-label]="'fullDetailsOf' | t: { p: r.name }"
            [title]="'fullDetailsOf' | t: { p: r.name }"
            (click)="page.emit(r.id)"
          >
            <svg [mjIcon]="'expand'"></svg>
          </button>
        </div>
      }
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerWilayatComponent {
  readonly pick = output<string>();
  readonly sort = output<WilSort>();
  readonly page = output<number>();
  protected readonly drawer = inject(DrawerState);
  protected readonly sortItems = WIL_SORT_ITEMS;
  protected readonly rows = computed(() =>
    wilList(this.drawer.snap()?.rows ?? [], this.drawer.wSort()),
  );
}
