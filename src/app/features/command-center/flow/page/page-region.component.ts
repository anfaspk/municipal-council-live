import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { pct } from '../../../../domain/format';
import { regionGeo, type RegionWil } from '../../detail/region-geometry';

const BOX = { w: 360, h: 250 };
const HIT = 24,
  HIT_PX = 22.5;

import { fp } from './page-strings';

@Component({
  selector: 'div[flPgRegion]',
  host: { class: 'fl-card fl-pg-region', dir: 'ltr', '[class.loc]': 'current() !== null' },
  template: `@if (geo(); as g) {<svg [attr.viewBox]="'0 0 ' + g.w + ' ' + g.h" role="group" [attr.aria-label]="label()"><path class="face" [attr.d]="g.d" aria-hidden="true"/>
      @for (p of pins(); track p.id) {<g class="pin" [class]="p.band" [class.me]="p.id === current()" role="button" [attr.tabindex]="p.id === current() ? -1 : 0" [attr.aria-label]="p.label" [attr.aria-current]="p.id === current() ? 'true' : null" (click)="choose(p.id)" (keydown.enter)="choose(p.id)" (keydown.space)="$event.preventDefault(); choose(p.id)"><circle class="hit" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="hit()"/><circle class="dot" [attr.cx]="p.x" [attr.cy]="p.y" [attr.r]="p.r"/></g>}</svg>}
    <p class="fl-hint" dir="rtl">{{ hint() }}</p>`,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageRegionComponent {
  readonly gid = input.required<string>();
  readonly gname = input.required<string>();
  readonly rows = input.required<readonly RegionWil[]>();
  readonly current = input<number | null>(null);
  readonly pick = output<number>();
  private readonly drawn = signal(0);
  protected readonly geo = computed(() => regionGeo(this.gid(), this.rows(), BOX));
  protected readonly pins = computed(() =>
    (this.geo()?.pins ?? [])
      .map((p) => ({ ...p, r: p.r * 1.6, label: fp('flPgPinL', { p: p.name, t: pct(p.t) }) }))
      .sort((a, b) => Number(a.id === this.current()) - Number(b.id === this.current())),
  );
  protected readonly hit = computed(() => {
    const g = this.geo(),
      w = this.drawn();
    return g && w > 0 ? Math.max(HIT, (HIT_PX * g.w) / w) : HIT;
  });
  protected readonly label = computed(() => {
    const c = this.current(),
      me = c === null ? undefined : this.rows().find((r) => r.id === c);
    return me
      ? fp('flPgLocL', { p: me.name, g: this.gname() })
      : fp('flPgRegionL', { p: this.gname() });
  });
  protected readonly hint = computed(() => {
    const c = this.current(),
      me = c === null ? undefined : this.rows().find((r) => r.id === c);
    return me ? fp('flPgLocHint', { p: me.name }) : fp('flPgPinHint');
  });
  constructor() {
    const host: HTMLElement = inject(ElementRef).nativeElement;
    let ro: ResizeObserver | null = null;
    afterNextRender(() => {
      ro = new ResizeObserver(([e]) => this.drawn.set(e?.contentBoxSize[0]?.inlineSize ?? 0));
      ro.observe(host);
    });
    inject(DestroyRef).onDestroy(() => ro?.disconnect());
  }
  protected choose(id: number): void {
    if (id !== this.current()) this.pick.emit(id);
  }
}
