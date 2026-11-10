import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

export type CaGlyph = 'lock' | 'check' | 'clock' | 'alert' | 'retry' | 'dash';

@Component({
  selector: 'svg[caGlyph]',
  host: {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    focusable: 'false',
    class: 'ca-glyph',
    '[attr.data-g]': 'name()',
  },
  template: `
    @switch (name()) {
      @case ('lock') {
        <svg:rect x="5" y="10.5" width="14" height="10" rx="2.5" />
        <svg:path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
        <svg:path class="ca-gp" d="M12 14.5v2" />
      }
      @case ('check') {
        <svg:path class="ca-gp" d="M5 12.5l4.5 4.5L19 7.5" />
      }
      @case ('clock') {
        <svg:circle cx="12" cy="12" r="8.5" />
        <svg:path class="ca-gp" d="M12 7.5V12l3 2" />
      }
      @case ('alert') {
        <svg:path d="M12 3.5L2.5 20h19z" />
        <svg:path class="ca-gp" d="M12 10v4.5M12 17.2v.1" />
      }
      @case ('retry') {
        <svg:path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
        <svg:path class="ca-gp" d="M19.5 4v4.2h-4.2" />
      }
      @case ('dash') {
        <svg:circle cx="12" cy="12" r="8.5" />
        <svg:path class="ca-gp" d="M8 12h8" />
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AcceptGlyphComponent {
  readonly name = input.required<CaGlyph>({ alias: 'caGlyph' });
}
