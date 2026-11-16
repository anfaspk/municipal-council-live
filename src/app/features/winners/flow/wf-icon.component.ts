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
  menu: 'M4 7h16M4 12h16M4 17h16',
  back: 'M9 6l6 6-6 6',
  go: 'M15 6l-6 6 6 6',
  list: 'M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01',
  share: 'M12 4v11M7 9l5-5 5 5M5 14v6h14v-6',
  search: 'M11 5a6 6 0 1 1 0 12a6 6 0 0 1 0-12zM16 16l4 4',
  down: 'M6 9l6 6 6-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  unfull: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  box: 'M4 9h16v11H4zM8 9V5h8v4M10 13h4',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  warn: 'M12 7v6M12 17h.01M12 3a9 9 0 1 1 0 18a9 9 0 0 1 0-18z',
} as const;
export type WfIconName = keyof typeof PATHS;
const FILLED: ReadonlySet<WfIconName> = new Set(['play']);

@Component({
  selector: 'svg[wfIcon]',
  host: {
    class: 'wf-ic',
    '[class.fill]': 'filled()',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
  },
  template: `<svg:path [attr.d]="d()" />`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WfIconComponent {
  readonly wfIcon = input.required<WfIconName>();
  protected readonly d = computed(() => PATHS[this.wfIcon()]);
  protected readonly filled = computed(() => FILLED.has(this.wfIcon()));
}
