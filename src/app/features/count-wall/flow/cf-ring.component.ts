import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

const R = 44,
  C = 2 * Math.PI * R;

@Component({
  selector: 'div[cfRing]',
  host: { class: 'cf-ring' },
  template: `<svg viewBox="0 0 100 100" aria-hidden="true"><circle class="cf-ring-trk" cx="50" cy="50" r="44" /><circle class="cf-ring-arc" cx="50" cy="50" r="44" [attr.stroke-dasharray]="dash" [style.stroke-dashoffset]="off()" transform="rotate(-90 50 50)" /></svg><div class="cf-ring-in"><ng-content /></div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CfRingComponent {
  readonly k = input.required<number>({ alias: 'cfRing' });
  protected readonly dash = C.toFixed(2);
  protected readonly off = computed(() =>
    (C * (1 - Math.min(1, Math.max(0, this.k())))).toFixed(2),
  );
}
