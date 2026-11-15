import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'i[cfdWide]',
  template: '',
  host: { class: 'cfd-wide-mark', hidden: '', 'aria-hidden': 'true' },
  styleUrls: ['./draw-wide.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DrawWideComponent {}
