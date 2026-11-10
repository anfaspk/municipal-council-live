import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

export type IconName =
  | 'people'
  | 'badge'
  | 'ballot'
  | 'crown'
  | 'prev'
  | 'search'
  | 'sun'
  | 'moon'
  | 'tv'
  | 'expand'
  | 'trend'
  | 'play'
  | 'next'
  | 'close'
  | 'home'
  | 'village'
  | 'layers'
  | 'gauge'
  | 'pause';

const ATTRS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '1.5',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
};

@Component({
  selector: 'div.mj-icons',
  host: { 'aria-hidden': 'true' },
  templateUrl: './icon-sprite.component.html',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconSpriteComponent {}

@Component({
  selector: 'svg[mjIcon]',
  host: ATTRS,
  template: '<svg:use [attr.href]="href()" />',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconComponent {
  readonly name = input.required<IconName>({ alias: 'mjIcon' });
  protected readonly href = computed(() => '#i-' + this.name());
}
