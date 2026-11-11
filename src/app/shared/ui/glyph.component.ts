import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type GlyphKind = 'm' | 'f';

@Component({
  selector: 'span[mjGlyph]',
  host: { class: 'mj-sex', 'aria-hidden': 'true', '[attr.data-sex]': 'kind()' },
  template: '',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlyphComponent {
  readonly kind = input.required<GlyphKind>({ alias: 'mjGlyph' });
}
