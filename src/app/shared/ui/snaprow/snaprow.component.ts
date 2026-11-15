import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { reducedMotion } from '../../motion/reduced-motion';
import { activeOf, keyStep } from './snaprow.model';

@Directive({ selector: '[mjSnapItem]', host: { class: 'mj-snap-item', role: 'listitem' } })
export class SnapItemDirective {
  readonly el: HTMLElement = inject(ElementRef).nativeElement;
}

@Component({
  selector: 'div[mjSnapRow]',
  styleUrls: ['./snaprow.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mj-snaprow', role: 'group', '[attr.aria-label]': 'label()' },
  template: `<div class="mj-snaprow-track" role="list" #track (keydown)="key($event)" (focusin)="focused($event)"><ng-content /></div>
  @if (items().length > 1) {<div class="mj-snaprow-dots">@for (d of items(); track $index) {<button type="button" class="mj-snaprow-dot" [class.on]="$index === active()" [attr.aria-current]="$index === active() ? 'true' : null" [attr.aria-label]="dotL($index)" (click)="go($index, false)"><i aria-hidden="true"></i></button>}</div>}`,
})
export class SnapRowComponent {
  readonly label = input.required<string>();
  protected readonly items = contentChildren(SnapItemDirective);
  protected readonly active = signal(0);
  private readonly n = computed(() => this.items().length);
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  private ratios: number[] = [];

  constructor() {
    let io: IntersectionObserver | null = null;
    afterNextRender(() => {
      io = new IntersectionObserver(
        (list) => {
          const els = this.items().map((i) => i.el);
          for (const e of list) {
            const k = els.indexOf(e.target as HTMLElement);
            if (k >= 0) this.ratios[k] = e.intersectionRatio;
          }
          this.active.set(activeOf(this.ratios));
        },
        { root: this.track().nativeElement, threshold: [0, 0.25, 0.5, 0.75, 1] },
      );
      this.items().forEach((i) => io!.observe(i.el));
    });
    effect(() => {
      const items = this.items(),
        on = this.active();
      items.forEach((it, k) => {
        it.el.tabIndex = k === on ? 0 : -1;
        io?.observe(it.el);
      });
    });
    inject(DestroyRef).onDestroy(() => io?.disconnect());
  }

  protected dotL(k: number): string {
    return t('snapCard', { i: k + 1, n: this.n() });
  }
  cycle(): void {
    if (this.n() > 1) this.go((this.active() + 1) % this.n(), false);
  }
  protected go(k: number, focus: boolean): void {
    const el = this.items()[k]?.el;
    if (!el) return;
    if (focus) el.focus({ preventScroll: true });
    el.scrollIntoView({
      behavior: reducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'start',
    });
    this.active.set(k);
  }
  protected key(e: KeyboardEvent): void {
    const at = this.items().findIndex((i) => i.el === e.target);
    if (at < 0) return;
    const rtl = getComputedStyle(this.track().nativeElement).direction === 'rtl',
      j = keyStep(e.key, at, this.n(), rtl);
    if (j === null) return;
    e.preventDefault();
    this.go(j, true);
  }
  protected focused(e: FocusEvent): void {
    const at = this.items().findIndex((i) => i.el === e.target);
    if (at >= 0 && at !== this.active()) this.go(at, false);
  }
}
