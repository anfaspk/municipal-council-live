import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { rng } from './ornament';

const W = 1920,
  H = 120;
function ridge(base: number, amp: number, seed: number, step: number): string {
  const rr = rng(seed),
    pts: string[] = [];
  let y = base;
  for (let x = 0; x <= W; x += step) {
    y =
      base -
      amp * (0.5 + 0.5 * Math.sin(x / 140 + seed) * Math.cos(x / 61 + seed * 2)) -
      rr() * amp * 0.25;
    pts.push(x + ',' + y.toFixed(1));
  }
  pts[pts.length - 1] = W + ',' + pts[0]!.split(',')[1];
  return pts.join(' ');
}
const RIDGES = [
  { points: ridge(96, 40, 3, 24), cls: 'ridge', opacity: '.22' },
  { points: ridge(108, 30, 7, 18), cls: 'ridge', opacity: '.16' },
  { points: ridge(116, 22, 11, 14), cls: 'ridge g', opacity: '.22' },
];
const FORT = 'M0 58V22h6v-6h6v6h6v-6h6v6h6v-6h6v6h6V10a10 10 0 0 1 20 0v48';
const PALM = [
  'M10 60c2-18 1-34-4-48',
  'M6 12c-8-6-18-6-24 0M6 12c-4-9-12-13-20-12M6 12c3-8 10-12 19-10M6 12c8-4 17-2 22 4M6 12c2 6 0 13-5 18',
];

@Component({
  selector: 'div.mj-horizon',
  template: `<div class="drift">
    @for (copy of [0, 1]; track copy) {
      <svg [attr.viewBox]="viewBox" preserveAspectRatio="none" aria-hidden="true">
        @for (r of ridges; track $index) {
          <svg:polyline [attr.class]="r.cls" [attr.points]="r.points" [attr.opacity]="r.opacity" />
        }
        <svg:g transform="translate(1380 62)">
          <svg:path class="sil" [attr.d]="fort + 'z'" />
          <svg:path class="sil-l" [attr.d]="fort" />
        </svg:g>
        <svg:g transform="translate(420 60)" class="sil-l">
          @for (d of palm; track $index) {
            <svg:path [attr.d]="d" />
          }
        </svg:g>
      </svg>
    }
  </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorizonComponent {
  protected readonly viewBox = '0 0 ' + W + ' ' + H;
  protected readonly ridges = RIDGES;
  protected readonly fort = FORT;
  protected readonly palm = PALM;
}
