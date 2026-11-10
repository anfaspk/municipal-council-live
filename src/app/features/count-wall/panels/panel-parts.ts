import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';
import { CCand, CSt } from '../../../domain/count/count';
import { ct } from '../../../core/i18n/count-strings';
import { fmt, pctOf } from '../../../domain/format';
import { starPoints } from '../../../shared/ui/ornament';

@Component({
  selector: 'i[countAvatar], span[countAvatar]',
  // prettier-ignore
  template: `@if (candidate().photo) {<img [src]="candidate().photo" alt="" decoding="async" />} @else {{{ candidate().ini }}}`,
  host: { class: 'cx-av', '[class.ph]': '!!candidate().photo' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountAvatar {
  readonly candidate = input.required<CCand>({ alias: 'countAvatar' });
}

@Component({
  selector: 'svg[countStar]',
  template: '<svg:polygon [attr.points]="points" />',
  host: { class: 'star', viewBox: '0 0 24 24', 'aria-hidden': 'true' },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountStar {
  protected readonly points = starPoints(12, 12, 11);
}

@Component({
  selector: 'svg[countStatus]',
  template: `@let g = geometry();
    <svg:circle
      [attr.cx]="g.h"
      [attr.cy]="g.h"
      [attr.r]="g.r"
      [attr.class]="status() === 'await' ? 'o' : status() === 'count' ? 't' : 'd'"
    />
    @if (status() === 'count') {
      <svg:path class="a" [attr.d]="g.arc" />
    } @else if (status() !== 'await') {
      <svg:path [attr.d]="g.tick" />
    }`,
  host: {
    '[class]': "'cxg ' + status()",
    '[attr.width]': 'size()',
    '[attr.height]': 'size()',
    '[attr.viewBox]': "'0 0 ' + size() + ' ' + size()",
    '[style.--sw]': 'geometry().sw',
    'aria-hidden': 'true',
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountStatus {
  readonly status = input.required<CSt>({ alias: 'countStatus' });
  readonly size = input(16);
  protected readonly geometry = computed(() => {
    const h = this.size() / 2,
      r = this.size() * 0.38,
      f = (n: number) => n.toFixed(2);
    return {
      h,
      r: f(r),
      sw: f(Math.max(1.2, this.size() / 11)) + 'px',
      arc: `M${h} ${f(h - r)}A${f(r)} ${f(r)} 0 1 1 ${f(h - r)} ${h}`,
      tick: `M${f(h - r * 0.48)} ${f(h + r * 0.02)}l${f(r * 0.36)} ${f(r * 0.36)}l${f(r * 0.62)} ${f(-r * 0.7)}`,
    };
  });
}

@Component({
  selector: 'div[countStats]',
  template: `<div class="cx-st c">
      <span>{{ text('cCounted') }}</span
      ><b [class]="'mj-num cx-' + prefix() + 'c'">{{ number(counted()) }}</b
      ><em [class]="'mj-num cx-' + prefix() + 'p'">{{
        percentOf(counted(), cast())
      }}</em>
    </div>
    <div class="cx-st l">
      <span>{{ text('cxUncounted') }}</span
      ><b [class]="'mj-num cx-' + prefix() + 'l'">{{ number(cast() - counted()) }}</b
      ><em>{{ text('cOfCast', { v: number(cast()) }) }}</em>
    </div>
    <div class="cx-st m">
      <span>{{ text('cxMaleV') }}</span
      ><b class="mj-num">{{ number(gender().m) }}</b
      ><em>{{ percentOf(gender().m, cast()) }}</em>
    </div>
    <div class="cx-st f">
      <span>{{ text('cxFemaleV') }}</span
      ><b class="mj-num">{{ number(gender().f) }}</b
      ><em>{{ percentOf(gender().f, cast()) }}</em>
    </div>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountStats {
  readonly counted = input.required<number>();
  readonly cast = input.required<number>();
  readonly gender = input.required<{ m: number; f: number }>();
  readonly prefix = input('x');
  protected readonly text = ct;
  protected readonly number = fmt;
  protected readonly percentOf = pctOf;
}

@Component({
  selector: 'div.cx-th',
  template: `<span>{{ first() }}</span
    ><span>{{ text('cCounted') }}</span
    ><span>{{ text('cxUncounted') }}</span
    ><span class="m">{{ text('cxMale') }}</span
    ><span class="f">{{ text('cxFemale') }}</span
    ><span>{{ last() }}</span
    ><span></span>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CountTableHead {
  readonly first = input.required<string>();
  readonly last = input.required<string>();
  protected readonly text = ct;
}
