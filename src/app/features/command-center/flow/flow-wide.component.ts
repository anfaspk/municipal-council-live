import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'i[flWide]',
  template: '',
  host: { class: 'fl-wide', hidden: '', 'aria-hidden': 'true' },
  styleUrls: ['./flow-wide.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlowWideComponent {}
