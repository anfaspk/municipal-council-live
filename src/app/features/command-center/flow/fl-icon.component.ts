import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

const PATHS = {
  menu: 'M4 7h16M4 12h16M4 17h16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  tv: 'M3 6h18v11H3zM8 21h8M12 17v4',
  box: 'M4 9h16v11H4zM8 9V5h8v4M10 13h4',
  medal:
    'M8 2.5l2.6 6M16 2.5l-2.6 6M12 9a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11zM9.6 14.6l1.7 1.7 3.2-3.3',
  close: 'M6 6l12 12M18 6L6 18',
  share: 'M12 4v11M7 9l5-5 5 5M5 14v6h14v-6',
  back: 'M15 6l-6 6 6 6',
  fwd: 'M9 6l6 6-6 6',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 1 0 0-13M15.5 15.5L20 20',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  out: 'M14 5h5v5M19 5l-8 8M10 5H5v14h14v-5',
  moon: 'M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z',
  full: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  add: 'M5 4h14v16H5zM12 8v8M8 12h8',
  unfull: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20h4',
  star: 'M12 4l2.4 5 5.6.8-4 4 1 5.6L12 17l-5 2.4 1-5.6-4-4 5.6-.8z',
} as const;
export type FlIconName = keyof typeof PATHS;

@Component({
  selector: 'svg[flIcon]',
  host: { class: 'fl-ic', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
  template: `<svg:path [attr.d]="d()" />`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlIconComponent {
  readonly flIcon = input.required<FlIconName>();
  protected readonly d = computed(() => PATHS[this.flIcon()]);
}
