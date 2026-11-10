import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { RegionShape } from '../tv-geometry';

@Component({
  selector: 'svg[appTvRegionShape]',
  host: {
    '[attr.viewBox]': 'shape().viewBox',
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
    'aria-hidden': 'true',
  },
  templateUrl: './tv-region-shape.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvRegionShapeComponent {
  readonly shape = input.required<RegionShape>();

  protected ref(part: string): string {
    return this.shape().id + '-' + part;
  }
  protected href(part: string): string {
    return '#' + this.ref(part);
  }
  protected url(part: string): string {
    return 'url(#' + this.ref(part) + ')';
  }
}
