import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { markBroken, picLoaded, portraitOk, portraitReady } from './portrait';
@Component({
  selector: 'span[mjRaceAv]',
  host: { class: 'mj-av', 'aria-hidden': 'true' },
  template: `@let c = cand();
    <b>{{ c.ini }}</b>
    @if (photo(); as p) {
      <img class="mj-pic" [class.on]="now()" [class.now]="now()" [src]="p" alt="" decoding="async" (load)="loaded($event)" (error)="failed()" />
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RaceAvatarComponent {
  readonly cand = input.required<{ ini: string; photo: string | null }>();
  private readonly bad = signal<string | null>(null);
  protected readonly photo = computed(() => {
    const p = this.cand().photo;
    return p !== this.bad() && portraitOk(p) ? p : null;
  });
  protected readonly now = computed(() => portraitReady(this.photo()));
  protected loaded(e: Event): void {
    picLoaded(e.target as Element);
  }
  protected failed(): void {
    markBroken(this.photo());
    this.bad.set(this.photo());
  }
}
