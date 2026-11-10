import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import { Curve, CURVE_H, CURVE_W } from '../tv-geometry';

@Component({
  selector: 'svg[appTvCurve]',
  host: { '[attr.viewBox]': 'viewBox', preserveAspectRatio: 'none', 'aria-hidden': 'true' },
  template: `
    @let c = curve();
    <svg:defs><svg:linearGradient [attr.id]="c.id" x1="0" y1="0" x2="0" y2="1"><svg:stop class="tv-bs" offset="0" stop-opacity=".38"/><svg:stop class="tv-bs" offset="1" stop-opacity="0"/></svg:linearGradient></svg:defs>
    @for (y of c.grid; track $index) {<svg:line x1="0" [attr.x2]="width" [attr.y1]="y" [attr.y2]="y" class="gl"/>}
    <svg:path class="area" [attr.d]="c.area" [attr.fill]="'url(#' + c.id + ')'"/>
    <svg:path class="ln" [attr.d]="c.line" pathLength="1"/>
    <svg:circle class="hd" [attr.cx]="c.head.cx" [attr.cy]="c.head.cy" r="4.5"/>
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvCurveComponent {
  readonly curve = input.required<Curve>();
  protected readonly width = CURVE_W;
  protected readonly viewBox = '0 -8 ' + CURVE_W + ' ' + (CURVE_H + 16);
}
