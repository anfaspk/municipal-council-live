import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type GlyphKind = 'm' | 'f';

@Component({
  selector: 'svg[mjGlyph]',
  host: { viewBox: '0 0 32 32', 'aria-hidden': 'true' },
  template: `@if (kind() === 'm') {
      <svg:path d="M10.4 11.6c.3-3.8 2.6-5.8 5.6-5.8s5.3 2 5.6 5.8z" />
      <svg:path d="M12.8 8.2h6.4" opacity=".6" />
      <svg:path d="M10.6 12.6c.3 3.9 2.5 6.4 5.4 6.4s5.1-2.5 5.4-6.4" />
      <svg:path d="M5.5 29c.9-5.4 4.8-8.6 10.5-8.6s9.6 3.2 10.5 8.6" />
      <svg:path d="M16 20.4v4.4" />
      <svg:circle cx="16" cy="26" r=".9" />
    } @else {
      <svg:path d="M8.8 16.2C8.8 9.9 11.9 5.6 16 5.6s7.2 4.3 7.2 10.6c0 2.5-.9 4.3-2.2 5.4" />
      <svg:path d="M10.8 21.6c-1.3-1.1-2-2.9-2-5.4" />
      <svg:ellipse cx="16" cy="14.6" rx="3.8" ry="4.4" />
      <svg:path d="M5.5 29c.7-4.6 3.5-7.4 7.4-8.4h6.2c3.9 1 6.7 3.8 7.4 8.4" />
      <svg:path d="M12.4 20.6c1 .9 2.2 1.3 3.6 1.3s2.6-.4 3.6-1.3" />
    }`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlyphComponent {
  readonly kind = input.required<GlyphKind>({ alias: 'mjGlyph' });
}
