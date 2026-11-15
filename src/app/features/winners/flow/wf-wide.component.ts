import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'i[wfWide]',
  template: '',
  host: { class: 'wf-wide-mark', hidden: '', 'aria-hidden': 'true' },
  styleUrls: ['./wf-wide.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WfWideComponent {}
