import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'i[cfWide]',
  template: '',
  host: { class: 'cf-wide-mark', hidden: '', 'aria-hidden': 'true' },
  styleUrls: ['./cf-wide.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfWideComponent {}
