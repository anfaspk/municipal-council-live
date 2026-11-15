import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { reducedMotion } from '../../motion/reduced-motion';
import { SwipeDirective } from '../../motion/swipe.directive';
import { IconComponent } from '../icon.component';
import { sheetDrag } from './sheet-drag';
import {
  detentHeights,
  modalAt,
  snapOf,
  stepOf,
  type Detent,
  type DetentHeights,
} from './sheet-detent.model';
import { SHEET_HISTORY } from './sheet-history';

@Component({
  selector: 'dialog[mjSheet]',
  imports: [IconComponent, SwipeDirective],
  styleUrls: ['./sheet.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mj-sheet',
    '[class.side]': 'side()',
    '[class.detents]': 'detents()',
    '[class.peek]': "detents() && detent() === 'peek'",
    '[class.drag]': 'dragging()',
    '[attr.aria-label]': 'label()',
    '[attr.data-detent]': 'detents() ? detent() : null',
    '[style.--sheet-full.px]': 'detents() ? heights().full : null',
    '[style.--sheet-off.px]': 'detents() ? offset() : null',
    '(cancel)': 'cancel($event)',
    '(click)': 'backdrop($event)',
    '(keydown.escape)': 'escape($event)',
  },
  template: `<div class="mj-sheet-in" mjSwipe="y" (swipeDown)="swiped()">
    <div class="mj-sheet-bar" #bar>@if (detents()) {<button type="button" class="mj-sheet-grip-b" [attr.aria-label]="stepL()" [title]="stepL()" (click)="step()"><span class="mj-sheet-grip" aria-hidden="true"></span></button>} @else {<span class="mj-sheet-grip" aria-hidden="true"></span>}<button type="button" class="mj-btn icon mj-sheet-x" [attr.aria-label]="closeL" [title]="closeL" (click)="close()"><svg [mjIcon]="'close'"></svg></button></div>
    <div class="mj-sheet-body"><div class="mj-sheet-content" #content><ng-content /></div></div>
  </div>`,
})
export class SheetComponent {
  readonly open = model(false);
  readonly label = input.required<string>();
  readonly side = input(false);
  readonly detents = input(false);
  readonly detent = model<Detent>('half');
  readonly closed = output<void>();
  protected readonly closeL = t('close');
  private readonly el: HTMLDialogElement = inject(ElementRef).nativeElement;
  private readonly history = inject(SHEET_HISTORY, { optional: true });
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private readonly content = viewChild.required<ElementRef<HTMLElement>>('content');
  private drop: (() => void) | null = null;
  private leaving = false;
  private bodyPad = 0;
  private readonly barH = signal(0);
  private readonly contentH = signal(0);
  private readonly room = signal(0);
  protected readonly dragging = signal<number | null>(null);
  protected readonly heights = computed<DetentHeights>(() =>
    detentHeights(this.barH() + this.contentH(), this.room()),
  );
  protected readonly offset = computed(
    () => this.dragging() ?? this.heights().full - this.heights()[this.detent()],
  );
  protected readonly stepL = computed(() => {
    const next = stepOf(this.detent(), this.heights());
    return next === 'closed' ? this.closeL : t(next === 'full' ? 'sheetFull' : 'sheetMore');
  });

  constructor() {
    effect(() => {
      const on = this.open(),
        modal = !this.detents() || modalAt(this.detent());
      untracked(() => (on ? this.show(modal) : this.hide()));
    });
    const vv = window.visualViewport;
    const kb = () => {
      const k = vv ? Math.max(0, Math.round(innerHeight - vv.height * vv.scale - vv.offsetTop)) : 0;
      this.el.style.setProperty('--sheet-kb', k + 'px');
      this.room.set(this.roomOf(k));
    };
    vv?.addEventListener('resize', kb);
    addEventListener('resize', kb);
    const ro =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver((list) => {
            for (const e of list) {
              const h = e.borderBoxSize[0]?.blockSize ?? e.contentRect.height;
              if (e.target === this.bar().nativeElement) this.barH.set(h);
              else this.contentH.set(h + this.bodyPad);
            }
          })
        : null;
    let undrag: (() => void) | null = null;
    afterNextRender(() => {
      kb();
      ro?.observe(this.bar().nativeElement);
      ro?.observe(this.content().nativeElement);
      const body = this.content().nativeElement.parentElement!;
      const cs = getComputedStyle(body);
      this.bodyPad = parseFloat(cs.paddingBlockStart) + parseFloat(cs.paddingBlockEnd) || 0;
      undrag = sheetDrag(this.bar().nativeElement, {
        offset: () => this.offset(),
        full: () => this.heights().full,
        move: (off) => {
          if (this.detents()) this.dragging.set(off);
        },
        end: (h, v) => {
          if (!this.detents()) return;
          this.dragging.set(null);
          const to = snapOf(h, v, this.heights());
          if (to === 'closed') this.close();
          else this.detent.set(to);
        },
      });
    });
    inject(DestroyRef).onDestroy(() => {
      vv?.removeEventListener('resize', kb);
      removeEventListener('resize', kb);
      ro?.disconnect();
      undrag?.();
      this.drop?.();
      if (this.el.open) this.el.close();
    });
  }

  close(): void {
    this.open.set(false);
  }
  protected cancel(e: Event): void {
    e.preventDefault();
    this.close();
  }
  protected backdrop(e: MouseEvent): void {
    if (e.target === this.el) this.close();
  }
  protected escape(e: Event): void {
    if (this.el.open && !this.el.matches(':modal')) {
      e.preventDefault();
      this.close();
    }
  }
  protected swiped(): void {
    if (!this.detents()) this.close();
  }
  protected step(): void {
    const next = stepOf(this.detent(), this.heights());
    if (next === 'closed') this.close();
    else this.detent.set(next);
  }

  private roomOf(kb: number): number {
    const top = parseFloat(getComputedStyle(this.el).getPropertyValue('--safe-top')) || 0;
    return Math.max(0, innerHeight - top - kb - 24);
  }

  private show(modal: boolean): void {
    this.leaving = false;
    this.el.classList.remove('out');
    if (this.el.open && this.el.matches(':modal') !== modal) this.el.close();
    if (!this.el.open) {
      if (modal) this.el.showModal();
      else this.el.show();
    }
    this.drop ??=
      this.history?.enter(() => {
        this.drop = null;
        this.close();
      }) ?? null;
  }
  private hide(): void {
    if (!this.el.open || this.leaving) return;
    this.drop?.();
    this.drop = null;
    this.leaving = true;
    this.dragging.set(null);
    const done = () => {
      if (!this.leaving) return;
      this.leaving = false;
      this.el.classList.remove('out');
      this.el.close();
      this.closed.emit();
    };
    if (reducedMotion()) return done();
    this.el.classList.add('out');
    this.el.addEventListener('animationend', done, { once: true });
    setTimeout(done, 600);
  }
}
