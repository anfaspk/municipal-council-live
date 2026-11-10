import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'span[mjRaceAv]',
  host: { 'aria-hidden': 'true' },
  template: `@let c = cand();
    @if (c.photo) {
      <img [src]="c.photo" alt="" loading="lazy" />
    } @else {
      <b>{{ c.ini }}</b>
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceAvatarComponent {
  readonly cand = input.required<{ ini: string; photo: string | null }>();
}
