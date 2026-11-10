import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import { starPoints } from './ornament';
import { uid } from './uid';

const LATTICE_SIZE = 72;
const LATTICE = (() => {
  const S = LATTICE_SIZE,
    R = 13;
  const star =
    'M' +
    starPoints(S / 2, S / 2, R)
      .split(' ')
      .join(' L') +
    ' Z';
  const r2 = R * 0.7654;
  const links =
    'M' +
    (S / 2 + R) +
    ' ' +
    S / 2 +
    ' H' +
    (S + 0) +
    ' M0 ' +
    S / 2 +
    ' H' +
    (S / 2 - R) +
    ' M' +
    S / 2 +
    ' ' +
    (S / 2 + R) +
    ' V' +
    S +
    ' M' +
    S / 2 +
    ' 0 V' +
    (S / 2 - R) +
    ' M0 0 L' +
    (S / 2 - r2 * 0.7071) +
    ' ' +
    (S / 2 - r2 * 0.7071) +
    ' M' +
    S +
    ' 0 L' +
    (S / 2 + r2 * 0.7071) +
    ' ' +
    (S / 2 - r2 * 0.7071) +
    ' M0 ' +
    S +
    ' L' +
    (S / 2 - r2 * 0.7071) +
    ' ' +
    (S / 2 + r2 * 0.7071) +
    ' M' +
    S +
    ' ' +
    S +
    ' L' +
    (S / 2 + r2 * 0.7071) +
    ' ' +
    (S / 2 + r2 * 0.7071);
  return { star, links };
})();
@Component({
  selector: 'svg[mjLattice]',
  host: { class: 'mj-lattice', 'aria-hidden': 'true' },
  template: `<svg:defs>
      <svg:pattern
        [attr.id]="id"
        [attr.width]="size"
        [attr.height]="size"
        patternUnits="userSpaceOnUse"
      >
        <svg:path [attr.d]="tile.star" />
        <svg:path [attr.d]="tile.links" opacity=".55" />
      </svg:pattern>
    </svg:defs>
    <svg:rect width="100%" height="100%" [attr.fill]="fill" [style.fill]="fill" />`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatticeComponent {
  protected readonly id = uid('lat');
  protected readonly size = LATTICE_SIZE;
  protected readonly tile = LATTICE;
  protected readonly fill = 'url(#' + this.id + ')';
}
