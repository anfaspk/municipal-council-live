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
  share: 'M12 4v11M7 9l5-5 5 5M5 14v6h14v-6',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  box: 'M4 9h16v11H4zM8 9V5h8v4M10 13h4',
  crown: 'M3 8l4 4 5-7 5 7 4-4-2 11H5z',
  star: 'M12 4l2.4 5 5.6.8-4 4 1 5.6L12 17l-5 2.4 1-5.6-4-4 5.6-.8z',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  sun: 'M12 8a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
} as const;
export type CfIconName = keyof typeof PATHS;
const FILLED: ReadonlySet<CfIconName> = new Set(['play']);

@Component({
  selector: 'svg[cfIcon]',
  host: {
    class: 'cf-ic',
    '[class.fill]': 'filled()',
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
  },
  template: `<svg:path [attr.d]="d()" />`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfIconComponent {
  readonly cfIcon = input.required<CfIconName>();
  protected readonly d = computed(() => PATHS[this.cfIcon()]);
  protected readonly filled = computed(() => FILLED.has(this.cfIcon()));
}
