import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { Locator } from '../tv-geometry';

@Component({
  selector: 'svg[appTvLocator]',
  host: { '[attr.viewBox]': 'locator().viewBox', 'aria-hidden': 'true' },
  template: `
    @for (r of locator().regions; track r.id) {<svg:path [attr.d]="r.d" [class.on]="r.on"/>}
    <svg:circle [attr.cx]="locator().ping.cx" [attr.cy]="locator().ping.cy" r="34" class="ping"/>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvLocatorComponent {
  readonly locator = input.required<Locator>();
}
