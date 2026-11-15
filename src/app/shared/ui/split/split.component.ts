import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  model,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { IconComponent } from '../icon.component';
import { SHEET_HISTORY } from '../sheet/sheet-history';
import { splitMode, type SplitMode } from './split.model';

@Component({
  selector: 'div[mjSplit]',
  imports: [IconComponent],
  styleUrls: ['./split.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mj-split',
    '[class.split]': "mode() === 'split'",
    '[class.stack]': "mode() === 'stack'",
    '[class.open]': 'open()',
  },
  template: `<div class="mj-split-list" [hidden]="mode() === 'stack' && open()"><ng-content select="[mjSplitList]" /></div>
  <section class="mj-split-detail" #detail tabindex="-1" [attr.aria-label]="label()" [hidden]="mode() === 'stack' && !open()">
    @if (mode() === 'stack') {<button type="button" class="mj-btn mj-split-back" (click)="open.set(false)"><svg [mjIcon]="'next'"></svg>{{ backL }}</button>}
    <ng-content select="[mjSplitDetail]" />
  </section>`,
})
export class SplitComponent {
  readonly label = input.required<string>();
  readonly open = model(false);
  protected readonly mode = signal<SplitMode>('stack');
  protected readonly backL = t('splitBack');
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly detail = viewChild.required<ElementRef<HTMLElement>>('detail');
  private readonly history = inject(SHEET_HISTORY, { optional: true });
  private drop: (() => void) | null = null;
  private scroll = 0;
  private opener: HTMLElement | null = null;
  private readonly injector = inject(Injector);

  constructor() {
    let ro: ResizeObserver | null = null;
    afterNextRender(() => {
      ro = new ResizeObserver(([e]) => {
        const w = e?.borderBoxSize[0]?.inlineSize ?? 0;
        this.mode.set(splitMode(w, innerWidth, innerHeight));
      });
      ro.observe(this.el);
    });
    effect(() => {
      const paged = this.open() && this.mode() === 'stack';
      untracked(() => (paged ? this.page() : this.unpage()));
    });
    inject(DestroyRef).onDestroy(() => {
      ro?.disconnect();
      this.drop?.();
    });
  }

  private page(): void {
    if (this.drop) return;
    this.scroll = scrollY;
    this.opener = document.activeElement as HTMLElement | null;
    this.drop =
      this.history?.enter(() => {
        this.drop = null;
        this.open.set(false);
      }) ?? (() => undefined);
    afterNextRender(
      () => {
        this.el.scrollIntoView({ block: 'start' });
        this.detail().nativeElement.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }
  private unpage(): void {
    if (!this.drop) return;
    const drop = this.drop;
    this.drop = null;
    drop();
    afterNextRender(
      () => {
        scrollTo({ top: this.scroll, behavior: 'instant' });
        this.opener?.focus({ preventScroll: true });
        this.opener = null;
      },
      { injector: this.injector },
    );
  }
}
