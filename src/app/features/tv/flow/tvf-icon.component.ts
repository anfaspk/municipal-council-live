import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

const PATHS = {
  close: 'M6 6l12 12M18 6L6 18',
  pause: 'M8 5v14M16 5v14',
  play: 'M8 5l11 7-11 7z',
  gear: 'M12 9a3 3 0 1 1 0 6a3 3 0 0 1 0-6zM19.4 13.5l1.6 1.2-1.8 3.1-1.9-.7a7 7 0 0 1-2 1.2l-.3 2h-3.6l-.3-2a7 7 0 0 1-2-1.2l-1.9.7-1.8-3.1 1.6-1.2a7 7 0 0 1 0-3l-1.6-1.2 1.8-3.1 1.9.7a7 7 0 0 1 2-1.2l.3-2h3.6l.3 2a7 7 0 0 1 2 1.2l1.9-.7 1.8 3.1-1.6 1.2a7 7 0 0 1 0 3z',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  back: 'M15 6l-6 6 6 6',
  pin: 'M9 4h6l-1 6 3 3H7l3-3zM12 13v7',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  ballot: 'M4 10h16v10H4zM8 10V4h8v6M10 14h4',
} as const;
export type TvfIconName = keyof typeof PATHS;
const FILLED: ReadonlySet<TvfIconName> = new Set(['play']);

@Component({
  selector: 'svg[tvfIcon]',
  host: {
    class: 'tvf-ic',
    '[class.fill]': 'filled()',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
  },
  template: `<svg:path [attr.d]="d()" />`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TvfIconComponent {
  readonly tvfIcon = input.required<TvfIconName>();
  protected readonly d = computed(() => PATHS[this.tvfIcon()]);
  protected readonly filled = computed(() => FILLED.has(this.tvfIcon()));
}
