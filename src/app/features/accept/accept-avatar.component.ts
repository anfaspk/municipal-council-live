import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { AcceptPerson } from '../../domain/conflict/accept';

@Component({
  selector: 'span.ca-av[caAv]',
  host: { 'aria-hidden': 'true' },
  template: `
    @if (photo(); as src) {
      <img [src]="src" alt="" decoding="async" (error)="broken.set(src)" />
    } @else {
      {{ person().initials }}
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptAvatarComponent {
  readonly person = input.required<AcceptPerson>({ alias: 'caAv' });
  protected readonly broken = signal<string | null>(null);
  protected readonly photo = computed(() => {
    const p = this.person().photo;
    return p && p !== this.broken() ? p : null;
  });
}
