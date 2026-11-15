import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'i[tvfWide]',
  template: '',
  host: { class: 'tvf-wide', hidden: '', 'aria-hidden': 'true' },
  styleUrls: ['./tvf-wide.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfWideComponent {}
