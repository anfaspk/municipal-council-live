import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { band } from '../../../domain/stats/turnout';
import { IconComponent } from '../../../shared/ui/icon.component';
import { FmtPipe, PctPipe } from '../../../shared/ui/format.pipes';
import { TPipe } from '../../../shared/ui/t.pipe';
import { CommandCenterState } from '../command-center.state';
import { DRow } from './drawer.model';
import { DrawerState } from './drawer.state';

@Component({
  selector: 'button.dw-wr',
  imports: [IconComponent, FmtPipe, PctPipe, TPipe],
  host: {
    '[class]': 'band()',
    '[class.is-sel]': 'row().name === drawer.wil()',
    '[class.is-hot]': 'row().name === state.wilHot()',
    '[attr.data-w]': 'row().name',
    '[style.--j]': 'index()',
  },
  template: `@let r = row();
    <span class="rk mj-num">{{ r.rank }}</span>
    <span class="nm"
      ><b>{{ r.name }}</b
      ><span>
        @if (r.vil; as vil) {
          <ng-container>{{ 'vilCount' | t: { n: vil.length } }} · </ng-container>
        }
        <span class="mj-num">{{ r.voted | fmt }} / {{ r.reg | fmt }}</span></span
      ></span
    >
    <span class="dw-br" [style.--t]="bar(r.t)" [style.--a]="bar(avg())"><i></i><em></em></span>
    <span class="pc mj-num">{{ r.t | pct }}</span>
    <span class="go"><svg [mjIcon]="'next'"></svg></span>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawerWilRowComponent {
  readonly row = input.required<DRow>();
  readonly index = input.required<number>();
  readonly avg = input.required<number>();
  protected readonly state = inject(CommandCenterState);
  protected readonly drawer = inject(DrawerState);
  protected readonly band = computed(() => band(this.row().t));
  protected readonly bar = barPos;
}

export const barPos = (p: number): string => Math.min(100, p).toFixed(1) + '%';
