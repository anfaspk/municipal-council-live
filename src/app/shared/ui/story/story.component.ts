import {
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
  ViewEncapsulation,
} from '@angular/core';
import { t } from '../../../core/i18n/i18n';
import { reducedMotion } from '../../motion/reduced-motion';
import { SlideClock } from '../../motion/slide-clock';
import { SwipeDirective } from '../../motion/swipe.directive';
import { IconComponent } from '../icon.component';
import { liveLine, segState, stepTo, storyKey, tapZone, type StoryStep } from './story.model';

@Component({
  selector: 'section[mjStory]',
  imports: [IconComponent, SwipeDirective],
  styleUrls: ['./story.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'mj-story',
    '[class.paused]': 'stopped()',
    '[class.still]': 'still',
    '[attr.aria-label]': 'label()',
    '[style.--story-ms.ms]': 'ms()',
    '(keydown)': 'key($event)',
    '(click)': 'tap($event)',
    '(focusin)': 'inside.set(true)',
    '(focusout)': 'left($event)',
  },
  template: `<div class="mj-story-top">
    <ol class="mj-story-segs" aria-hidden="true">@for (k of segs(); track round() + ':' + k) {<li [class]="seg(k)"><i></i></li>}</ol>
    <div class="mj-story-ctl">
      <span class="mj-story-at">{{ at() }}</span>
      <button type="button" class="mj-btn icon" [attr.aria-label]="prevL" [title]="prevL" (click)="go('prev')"><svg [mjIcon]="'next'"></svg></button>
      <button type="button" class="mj-btn icon mj-story-pp" [attr.aria-label]="paused() ? playL : pauseL" [title]="paused() ? playL : pauseL" (click)="toggle()"><svg [mjIcon]="paused() ? 'play' : 'pause'"></svg></button>
      <button type="button" class="mj-btn icon" [attr.aria-label]="nextL" [title]="nextL" (click)="go('next')"><svg [mjIcon]="'prev'"></svg></button>
      @if (closable()) {<button type="button" class="mj-btn icon" [attr.aria-label]="closeL" [title]="closeL" (click)="closed.emit()"><svg [mjIcon]="'close'"></svg></button>}
    </div>
  </div>
  <div class="mj-story-surface" mjSwipe="x" (swipeNext)="go('next')" (swipePrev)="go('prev')" (swipeDown)="down()" (holdStart)="hold(true)" (holdEnd)="hold(false)"><ng-content /></div>
  <p class="mj-sr" aria-live="polite">{{ live() }}</p>`,
})
export class StoryComponent {
  readonly label = input.required<string>();
  readonly count = input.required<number>();
  readonly ms = input(8000);
  readonly loop = input(true);
  readonly closable = input(false);
  readonly index = model(0);
  readonly paused = model(false);
  readonly closed = output<void>();
  readonly finished = output<void>();
  protected readonly prevL = t('storyPrev');
  protected readonly nextL = t('storyNext');
  protected readonly pauseL = t('storyPause');
  protected readonly playL = t('storyPlay');
  protected readonly closeL = t('close');
  protected readonly still = reducedMotion();
  protected readonly inside = signal(false);
  private readonly held = signal(false);
  private readonly hidden = signal(document.visibilityState === 'hidden');
  protected readonly stopped = computed(() => this.paused() || this.held() || this.hidden());
  protected readonly round = signal(0);
  protected readonly segs = computed(() => Array.from({ length: this.count() }, (_, k) => k));
  protected readonly at = computed(() => t('storyStep', { i: this.index() + 1, n: this.count() }));
  protected readonly live = signal('');
  private said: string | null = null;
  private readonly el: HTMLElement = inject(ElementRef).nativeElement;
  private readonly clock = new SlideClock();
  private swallow = false;

  constructor() {
    effect(() => {
      const i = this.index(),
        n = this.count(),
        ms = this.ms();
      this.round();
      untracked(() => {
        this.clock.reset();
        if (i >= n) return;
        this.clock.at(ms, () => this.advance());
        if (!this.stopped()) this.clock.start();
      });
    });
    effect(() => {
      if (this.stopped()) this.clock.stop();
      else this.clock.start();
    });
    effect(() => {
      const line = liveLine(this.label(), this.inside(), this.said);
      if (line === null) return;
      this.said = line;
      untracked(() => this.live.set(line));
    });
    const vis = () => this.hidden.set(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', vis);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('visibilitychange', vis);
      this.clock.reset();
    });
  }

  protected seg(k: number): string {
    return 'mj-story-seg ' + segState(k, this.index());
  }
  protected toggle(): void {
    this.paused.set(!this.paused());
  }
  go(step: StoryStep): void {
    const j = stepTo(this.index(), this.count(), step, this.loop());
    if (j === null) return this.finished.emit();
    this.show(j);
  }
  private advance(): void {
    const j = stepTo(this.index(), this.count(), 'next', this.loop());
    if (j === null) {
      this.paused.set(true);
      this.finished.emit();
    } else this.show(j);
  }
  private show(j: number): void {
    if (j === this.index()) this.round.update((r) => r + 1);
    else this.index.set(j);
  }
  protected hold(on: boolean): void {
    this.held.set(on);
    if (!on) this.swallow = true;
  }
  protected down(): void {
    if (this.closable()) this.closed.emit();
  }
  protected tap(e: MouseEvent): void {
    if (this.swallow) {
      this.swallow = false;
      return;
    }
    const target = e.target as Element,
      surface = target.closest<HTMLElement>('.mj-story-surface');
    if (!surface || target.closest('a, button, input, select, textarea, [role="button"]')) return;
    const box = surface.getBoundingClientRect(),
      rtl = getComputedStyle(this.el).direction === 'rtl';
    this.go(tapZone(e.clientX, box.left, box.width, rtl));
  }
  protected key(e: KeyboardEvent): void {
    if ((e.target as Element).closest('input, select, textarea')) return;
    const k = storyKey(e.key, getComputedStyle(this.el).direction === 'rtl');
    if (!k || (k === 'close' && !this.closable())) return;
    e.preventDefault();
    if (k === 'toggle') this.toggle();
    else if (k === 'close') this.closed.emit();
    else if (k === 'first') this.show(0);
    else if (k === 'last') this.show(Math.max(0, this.count() - 1));
    else this.go(k);
  }
  protected left(e: FocusEvent): void {
    if (!this.el.contains(e.relatedTarget as Node | null)) this.inside.set(false);
  }
}
